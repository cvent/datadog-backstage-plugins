import gitUrlParse from 'git-url-parse';

import type { EntityV3Service } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2';

import type { ComponentEntity, Entity } from '@backstage/catalog-model';
import {
  ANNOTATION_SOURCE_LOCATION,
  getCompoundEntityRef,
  getEntitySourceLocation,
  isComponentEntity,
  stringifyEntityRef,
} from '@backstage/catalog-model';

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

export function defaultSerializer(
  entity: Entity | ComponentEntity,
  extraInfo?: ExtraSerializationInfo,
): EntityV3Service {
  ensureComponent(entity);

  const metadata = entity.metadata;
  const spec = entity?.spec ?? {};
  const repoInfo = resolveRepositoryInfo(entity);

  return {
    apiVersion: 'v3',
    kind: 'service',
    metadata: {
      name:
        metadata.annotations?.['datadoghq.com/service-name'] ?? metadata.name,
      ...valueGuard(metadata.description, description => ({
        description,
      })),
      ...valueGuard(spec.owner, teamName => ({
        owner: teamName,
      })),
      tags: [...labelsToTags(entity), ...(metadata.tags ?? [])],
      ...valueGuard(
        Array.from(getDatadogStyleLinks(entity, extraInfo)),
        links => ({
          links,
        }),
      ),
    },
    spec: {
      ...valueGuard(spec.lifecycle, lifecycle => ({
        lifecycle,
      })),
    },
    ...valueGuard(repoInfo, repo => ({
      datadog: {
        codeLocations: [
          {
            repositoryURL: repo.short_url,
            ...valueGuard(repo.path, path => ({
              paths: [path],
            })),
          },
        ],
      },
    })),
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

interface RepositoryInfo {
  provider: string;
  url: string;
  short_url: string;
  path: string;
}

function resolveRepositoryInfo(entity: Entity): RepositoryInfo | undefined {
  if (entity.metadata.annotations?.[ANNOTATION_SOURCE_LOCATION]) {
    try {
      const sourceLocation = getEntitySourceLocation(entity);
      if (sourceLocation.type === 'url') {
        const parsedRepo = gitUrlParse(sourceLocation.target);
        return {
          provider: parsedRepo.source,
          url: parsedRepo.href,
          short_url: `https://${parsedRepo.resource}/${parsedRepo.full_name}`,
          path: `${parsedRepo.filepath}/**`,
        };
      }
    } catch (err) {
      // there is no entity location.
    }
  }

  return undefined;
}

const LINK_TYPES: string[] = ['runbook', 'doc', 'repo', 'dashboard', 'other'];

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
        type: type && LINK_TYPES.includes(type) ? type : 'other',
        url: url,
      };
    }
  }

  if (extraInfo?.appBaseUrl) {
    const ref = getCompoundEntityRef(entity);
    yield {
      name: 'Backstage',
      type: 'doc',
      provider: 'backstage',
      url: `${extraInfo.appBaseUrl}/catalog/${ref.namespace}/${ref.kind}/${ref.name}`,
    };

    if (hasTechDocs) {
      yield {
        name: 'TechDocs',
        type: 'doc',
        provider: 'backstage',
        url: `${extraInfo.appBaseUrl}/docs/${ref.namespace}/${ref.kind}/${ref.name}`,
      };
    }
  }

  const repoInfo = resolveRepositoryInfo(entity);
  if (repoInfo) {
    yield {
      name: 'Source',
      type: 'repo',
      provider: repoInfo.provider,
      url: repoInfo.url,
    };
  }
}
