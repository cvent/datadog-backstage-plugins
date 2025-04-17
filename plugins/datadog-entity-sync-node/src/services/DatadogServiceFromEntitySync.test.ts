import { v2 } from '@datadog/datadog-api-client';

import { mockServices } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

import { serializeComponentToDatadogService } from '../transforms/serializeComponentToDatadogService';

import { DatadogServiceFromEntitySync } from './DatadogServiceFromEntitySync';

const MockedServiceDefinitionApi =
  v2.ServiceDefinitionApi as jest.Mock<v2.ServiceDefinitionApi>;

jest.mock('@datadog/datadog-api-client');

const MOCKED_ENTITIES = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'datadog-example-apm-service',
      title: 'Datadog Apm Service',
      annotations: {
        'datadoghq.com/service-name': 'datadog-example-apm-service',
        'backstage.io/techdocs-ref': './',
      },
    },
    spec: {
      type: 'service',
      owner: 'example-team',
      system: 'datadog-example',
      lifecycle: 'experimental',
    },
  },
].flatMap(entity => Array(7).fill(entity));

const MOCKED_RESPONSE = [
  {
    schemaVersion: 'v2.2',
    ddService: 'datadog-example-apm-service',
    team: 'example-team',
    application: 'datadog-example',
    lifecycle: 'experimental',
    links: [
      {
        name: 'TechDocs',
        provider: 'backstage',
        type: 'doc',
        url: 'http://localhost:3000/docs/default/Component/datadog-example-apm-service',
      },
    ],
    tags: ['system:datadog-example'],
  },
].flatMap(response => Array(7).fill(response));

describe('DatadogServiceFromEntitySync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sync = new DatadogServiceFromEntitySync(
    {
      datadog: new MockedServiceDefinitionApi(),
      catalog: catalogServiceMock({ entities: MOCKED_ENTITIES }),
      auth: mockServices.auth.mock(),
      events: mockServices.events.mock(),
    },
    {
      syncId: 'test',
      taskRunner: mockServices.scheduler.mock().createScheduledTaskRunner({
        frequency: {
          milliseconds: 30,
        },
        timeout: {
          seconds: 1,
        },
      }),
      serialize: entity =>
        serializeComponentToDatadogService(entity, {
          appBaseUrl: 'http://localhost:3000',
        }),
      rateLimit: {
        count: 2,
        interval: {
          seconds: 1,
        },
      },
      logger: mockServices.logger.mock(),
    },
  );

  it('returns expected public response', async () => {
    const syncedServices = await sync.sync();

    expect(syncedServices).toEqual(MOCKED_RESPONSE);
  });
});
