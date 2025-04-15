export const MOCKED_ENTITIES = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'datadog-example-apm-service',
      title: 'Datadog Apm Service',
      annotations: {
        'datadoghq.com/service-name': 'backstage',
      },
    },
    spec: {
      type: 'service',
      owner: 'guests',
      lifecycle: 'experimental',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'sample',
      title: 'Sample Component',
    },
    spec: {
      type: 'service',
      owner: 'guests',
      lifecycle: 'experimental',
    },
  },
];
