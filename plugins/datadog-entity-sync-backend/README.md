# datadog-entity-sync-backend

This plugin backend is used to sync a Backstage catalog with a Datadog service catalog.

## Installation

This plugin is installed via the `@cvent/backstage-plugin-datadog-entity-sync-backend` package. To install it to your backend package, run the following command:

```bash
# From your root directory
yarn workspace backend add @cvent/backstage-plugin-datadog-entity-sync-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```typescript
const backend = createBackend();
// ...
backend.add(import('@cvent/backstage-plugin-datadog-entity-sync-backend'));
```

## Configuration

Here is an example configuration that you can leverage.

```yaml
datadog:
  integration:
    apiKey: ${DD_API_KEY}
    appKey: ${DD_APP_KEY}
    site: 'datadoghq.com' # Optional: Defaults to 'datadoghq.com'
events:
  http:
    topics:
      - datadog-entity-sync.datadog-service-from-component # this name has to mention the sync name below and in the extension.
datadog:
  sync:
    datadog-service-from-component: # this name has to mention the topic part name above and in the extension.
      entityFilter:
        kind: component
        metadata.annotations.datadoghq.com/service-name: CATALOG_FILTER_EXISTS # adjust to your identifier in datadog
      rateLimit:
        count: 60
        interval:
          minutes: 1
      schedule:
        frequency:
          cron: '1 1 * * *' # set to your schedule
        timeout:
          minutes: 10
      enabled: false # change to true in production
```

## Customization

In order to customize what entities are synced to datadog, and how the entities are serialized before they are synced, there is a "extension point" which can be used
to customize these options. Here is what the default options looks like.

This is the base extension point that comes with included in the `@cvent/backstage-plugin-datadog-entity-sync-backend` package. You can add it to your backend as such.

```typescript
import { defaultComponentSerializer } from '@cvent/backstage-plugin-datadog-entity-sync-backend';
const backend = createBackend();
// ...
backend.add(import('@cvent/backstage-plugin-datadog-entity-sync-backend'));
backend.add(defaultComponentSerializer);
```

And here is the default serializer.

```typescript
import { coreServices, createBackendModule, SchedulerServiceTaskScheduleDefinition } from '@backstage/backend-plugin-api';
import { EntityFilterQuery } from '@backstage/catalog-client';
import { defaultComponentSerializer } from '@cvent/backstage-backstage-plugin-datadog-entity-sync-node';
import { datadogServicesExtensionPoint } from '@cvent/backstage-backstage-plugin-datadog-entity-sync-node';

const SYNC_ID = 'datadog-service-from-component';

export const datadogServiceFromComponentAndGroupSync = createBackendModule({
  pluginId: 'datadog-entity-sync',
  moduleId: SYNC_ID,
  register(registrar) {
    registrar.registerInit({
      deps: {
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        catalog: catalogServiceRef,
        datadogSync: datadogEntitySyncExtensionPoint,
      },
      async init({ datadogSync, config, scheduler, catalog, auth }) {
        const { entityFilter, rateLimit, schedule, enabled } =
          config.get<DatadogEntitySyncConfig>(`datadog.sync.${SYNC_ID}`);
        const appBaseUrl = config.getString('app.baseUrl');

        datadogSync.defineSerializer({
          taskRunner: scheduler.createScheduledTaskRunner(schedule),
          entityFilter,
          rateLimit,
          serialize: defaultComponentSerializer,
          id: SYNC_ID,
        });
      },
    });
  },
});
```

The "serializeEntity" will take an entity (and an optional preloaded dataset) and return an `EntityV3`.
There is also an option where you can specify a set of data to be "preloaded" when a sync starts that will be passed to the serializeEntity as such.
Below is an example where we want to get some additional data from the owning teams to add to the entity.

```typescript
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  RELATION_OWNED_BY,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

import type { DatadogEntitySyncConfig } from '@cvent/backstage-plugin-datadog-entity-sync-node';
import { datadogEntitySyncExtensionPoint } from '@cvent/backstage-plugin-datadog-entity-sync-node';

const SYNC_ID = 'datadog-service-from-component-with-teams';

export const datadogServiceFromComponentAndGroupSync = createBackendModule({
  pluginId: 'datadog-entity-sync',
  moduleId: SYNC_ID,
  register(registrar) {
    registrar.registerInit({
      deps: {
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        catalog: catalogServiceRef,
        datadogSync: datadogEntitySyncExtensionPoint,
      },
      async init({ datadogSync, config, scheduler, catalog, auth }) {
        const { entityFilter, rateLimit, schedule, enabled } =
          config.get<DatadogEntitySyncConfig>(`datadog.sync.${SYNC_ID}`);
        const appBaseUrl = config.getString('app.baseUrl');
        const slackBaseUrl = config.getOptionalString(
          'slack.integrations.baseUrl',
        );

        datadogSync.defineSerializer({
          syncId: SYNC_ID,
          taskRunner: scheduler.createScheduledTaskRunner(schedule),
          entityFilter,
          rateLimit,
          enabled,
          preload: async () =>
            catalog.getEntities(
              {
                filter: { kind: 'group' },
                fields: [
                  'spec.contacts',
                  'metadata.name',
                  'kind',
                  'metadata.namespace',
                  'relations',
                ],
              },
              { credentials: await auth.getOwnServiceCredentials() },
            ),
          serialize: (entity, preload) => {
            const ownerRef = entity.relations?.find(
              relation => relation.type === RELATION_OWNED_BY,
            )?.targetRef;

            const ownerEntity = preload?.items.find(
              owner => stringifyEntityRef(owner) === ownerRef,
            );

            return {
              ...defaultComponentSerializer(entity, { appBaseUrl }),
              metadata: {
                ...defaultSerialization.metadata,
                ...valueGuard(
                  isGroupWithContacts(team) && getSlackChannels(team),
                  slackChannels => ({
                    contacts: slackChannels.map(slackChannel => ({
                      type: 'slack',
                      name: `#${slackChannel}`,
                      contact: `${slackBaseUrl}/archives/${slackChannel}`,
                    })),
                  }),
                ),
              },
            };
          },
        });
      },
    });
  },
});
```

To manually trigger a sync, you can issue an event with the topic of "sync-catalog-to-datadog" with an entity filter. If you register the event as a webhook endpoint, you can trigger it via an http call such as.

```bash
curl --request POST \
  --url https://backstage.myhost.net/api/events/http/datadog-entity-sync.datadog-service-from-component \
  --data '{
  "entityFilter": {
    "metadata.name": "my-entity-name"
  }
}'
```

The entity filter is your standard entity filter.

There is also a "serialize" endpoint that can be used to see what an entity will look like after it is serialized before it goes to datadog. This is called with the passing a filter in the url like you would for an entity query.

```bash
curl --request GET \
  --url 'https://backstage.myhost.net/api/datadog-services/datadog-service-from-component?entityFilter=spec.type=application,relations.ownedBy=my-team'
```

## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn start` from the root directory.
