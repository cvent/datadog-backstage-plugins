import { isGroupEntity } from '@backstage/catalog-model';
import type {
  ComponentEntity,
  Entity,
  GroupEntity,
} from '@backstage/catalog-model';

import type {
  DatadogServiceDefinition,
  ExtraSerializationInfo,
} from '@cvent/backstage-plugin-datadog-entity-sync-node';
import {
  serializeComponentToDatadogService,
  valueGuard,
} from '@cvent/backstage-plugin-datadog-entity-sync-node';

interface GroupWithContacts extends GroupEntity {
  spec: GroupEntity['spec'] & {
    contacts?: Array<{
      type: 'slack-channel' | 'slack-handle';
      value: string;
    }>;
  };
}

export function datadogServiceFromComponentAndGroupSerializer(
  entity: ComponentEntity | Entity,
  team?: GroupWithContacts | Entity,
  extraInfo?: {
    slackBaseUrl?: string;
  } & ExtraSerializationInfo,
): DatadogServiceDefinition {
  return {
    ...serializeComponentToDatadogService(entity, extraInfo),
    ...valueGuard(team?.metadata.title ?? team?.metadata.name, teamName => ({
      team: teamName,
    })),
    ...valueGuard(
      isGroupWithContacts(team) && getSlackChannels(team),
      slackChannels => ({
        contacts: slackChannels.map(slackChannel => ({
          type: 'slack',
          name: `#${slackChannel}`,
          contact: `${extraInfo?.slackBaseUrl}/archives/${slackChannel}`,
        })),
      }),
    ),
  };
}

function getSlackChannels({ spec: { contacts = [] } }: GroupWithContacts) {
  return contacts
    .filter(contact => contact.type === 'slack-channel')
    .map(contact => contact.value.replace(/^[#@]/, ''));
}

function isGroupWithContacts(
  team?: Entity | GroupWithContacts,
): team is GroupWithContacts {
  return Boolean(
    team &&
      isGroupEntity(team) &&
      'contacts' in team.spec &&
      Array.isArray(team.spec.contacts),
  );
}
