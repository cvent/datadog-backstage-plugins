import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

import type { DatadogEntitySyncConfig } from '@cvent/backstage-plugin-datadog-entity-sync-node';
import { datadogEntitySyncExtensionPoint } from '@cvent/backstage-plugin-datadog-entity-sync-node';
import { serializeComponentToDatadogService } from '@cvent/backstage-plugin-datadog-entity-sync-node';

const SYNC_ID = 'datadog-service-from-component';

export const datadogServiceFromComponentSerializer = createBackendModule({
  pluginId: 'datadog-entity-sync',
  moduleId: SYNC_ID,
  register(registrar) {
    registrar.registerInit({
      deps: {
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        datadogSync: datadogEntitySyncExtensionPoint,
      },
      async init({ datadogSync, config, scheduler }) {
        const { entityFilter, rateLimit, schedule, enabled } =
          config.get<DatadogEntitySyncConfig>(`datadog.sync.${SYNC_ID}`);

        datadogSync.defineSerializer({
          syncId: SYNC_ID,
          entityFilter,
          serialize: serializeComponentToDatadogService,
          rateLimit,
          enabled,
          taskRunner: scheduler.createScheduledTaskRunner(schedule),
        });
      },
    });
  },
});
