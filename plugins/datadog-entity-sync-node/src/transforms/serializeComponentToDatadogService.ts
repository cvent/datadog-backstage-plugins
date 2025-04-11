import gitUrlParse from 'git-url-parse';

import type { ComponentEntity, Entity } from '@backstage/catalog-model';
import {
  getCompoundEntityRef,
  getEntitySourceLocation,
  isComponentEntity,
  stringifyEntityRef,
} from '@backstage/catalog-model';

import type { DatadogServiceDefinition } from '@cvent/backstage-plugin-datadog-entity-sync-node';
import { valueGuard } from '@cvent/backstage-plugin-datadog-entity-sync-node';

function ensureComponent(
  entity: Entity | ComponentEntity,
): asserts entity is ComponentEntity {
  if (!isComponentEntity(entity))
    throw new Error(
      `Only Components are allowed to be synced, and ${stringifyEntityRef(entity)} is not a component.`,
    );
}

export interface ExtraSerializationInfo {
  appBaseUrl?: string;
}

export function serializeComponentToDatadogService(
  entity: Entity | ComponentEntity,
  extraInfo?: ExtraSerializationInfo,
): DatadogServiceDefinition {
  ensureComponent(entity);

  return {
    schemaVersion: 'v2.2',
    ddService:
      entity.metadata.annotations?.['datadoghq.com/service-name'] ??
      entity.metadata.name,
    team: entity.spec.owner,
    ...valueGuard(entity.spec.system, system => ({
      application: system,
    })),
    ...valueGuard(entity.metadata.description, description => ({
      description,
    })),
    // Need to figure out how we want to use tier, does that make sense to include here.
    ...valueGuard(entity.spec.lifecycle, lifecycle => ({
      lifecycle,
    })),
    ...valueGuard(
      Array.from(getDatadogStyleLinks(entity, extraInfo)),
      links => ({
        links,
      }),
    ),
    tags: [...labelsToTags(entity), ...(entity.metadata.tags ?? [])],
  };
}

function labelsToTags(entity: ComponentEntity) {
  const tags = Object.entries(entity.metadata.labels ?? {}).map(
    ([key, value]) => `${key}:${value}`,
  );

  if (entity.spec.system) {
    tags.push(`system:${entity.spec.system}`);
  }

  return tags;
}

type DatadogLinkTypes = NonNullable<
  DatadogServiceDefinition['links']
>[number]['type'];
const LINK_TYPES: DatadogLinkTypes[] = [
  'runbook',
  'doc',
  'repo',
  'dashboard',
  'other',
];

function* getDatadogStyleLinks(
  entity: ComponentEntity,
  extraInfo?: ExtraSerializationInfo,
) {
  const hasTechDocs = Boolean(
    entity.metadata.annotations?.['backstage.io/techdocs-ref'],
  );

  for (const { title, type, url } of entity.metadata.links ?? []) {
    if (title && url) {
      yield {
        name: title,
        type: type && type in LINK_TYPES ? type : 'other',
        url: url,
      };
    }
  }

  if (hasTechDocs && extraInfo?.appBaseUrl) {
    const ref = getCompoundEntityRef(entity);
    yield {
      name: 'TechDocs',
      type: 'doc',
      provider: 'backstage',
      url: `${extraInfo.appBaseUrl}/docs/${ref.namespace}/${ref.kind}/${ref.name}`,
    };
  }

  try {
    if (getEntitySourceLocation(entity).type === 'url') {
      yield {
        name: 'Source',
        type: 'repo',
        provider: gitUrlParse(getEntitySourceLocation(entity).target).source,
        url: getEntitySourceLocation(entity).target,
      };
    }
  } catch (err) {
    // there is no entity location.
  }
}
