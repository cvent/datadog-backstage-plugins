import { client, v2 } from '@datadog/datadog-api-client';

import {
  coreServices,
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';

export type DatadogServiceDefinition = v2.ServiceDefinitionV2Dot2;

export const datadogServiceDefinitionRef =
  createServiceRef<v2.ServiceDefinitionApi>({
    id: 'datadog.v2.ServiceDefinitionApi',
    scope: 'plugin',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          config: coreServices.rootConfig,
        },
        factory({ config }) {
          return new v2.ServiceDefinitionApi(
            client.createConfiguration({
              authMethods: {
                apiKeyAuth: config.getString('datadog.integration.apiKey'),
                appKeyAuth: config.getString('datadog.integration.appKey'),
              },
            }),
          );
        },
      }),
  });
