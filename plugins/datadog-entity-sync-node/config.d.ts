import type { SchedulerServiceTaskScheduleDefinition } from '@backstage/backend-plugin-api';
import type { EntityFilterQuery } from '@backstage/catalog-client';
import type { HumanDuration } from '@backstage/types';

import type { AllSyncConfigs } from './src/extensions';

export interface Config {
  datadog?: {
    integration?: {
      /**
       * Api key for datadog integration api.
       * @visibility secret
       */
      apiKey: string;

      /**
       * Application key for datadog
       * @visibility secret
       */
      appKey: string;
    };

    /**
     * Setting to control the syncing of data from backstage up to datadog.
     */
    sync?: AllSyncConfigs;
  };
}
