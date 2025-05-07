import type { Entity } from '@backstage/catalog-model/index';

import type { ExtraSerializationInfo } from './defaultComponentToDatadogSerializer';
import { defaultSerializer } from './defaultComponentToDatadogSerializer';

const defaultEntity: Entity = {
  apiVersion: 'backstage.io/v1beta3',
  kind: 'Component',
  metadata: {
    name: 'mocked-service',
  },
  spec: {
    owner: 'mocked-team',
  },
};

const defaultExtraInfo: ExtraSerializationInfo = {
  appBaseUrl: 'https://backstage',
};

describe('defaultSerializer', () => {
  let mockedEntity: Entity;

  beforeEach(() => {
    mockedEntity = Object.assign({}, {}, defaultEntity);
  });

  it('should transform a component entity into Datadog Software Catalog', () => {
    const serviceDefinition = defaultSerializer(mockedEntity);

    expect(serviceDefinition).toBeDefined();
    expect(serviceDefinition).toEqual(
      expect.objectContaining({
        apiVersion: 'v3',
        kind: 'service',
        metadata: expect.objectContaining({
          name: 'mocked-service',
        }),
      }),
    );
  });

  it('should not transform a component entity into Datadog Service Catalog', () => {
    mockedEntity.kind = 'Group';

    expect(() => {
      defaultSerializer(mockedEntity);
    }).toThrow(Error);
  });

  it('should allow overriding the service name with datadoghq.com/service-name annotation', () => {
    mockedEntity.metadata.annotations = {
      'datadoghq.com/service-name': 'mocked-service-override',
    };

    const serviceDefinition = defaultSerializer(mockedEntity);

    expect(serviceDefinition).toBeDefined();
    expect(serviceDefinition.metadata?.name).toBe('mocked-service-override');
  });

  it('should set the lifecycle if one is provided', () => {
    mockedEntity.spec = {
      ...mockedEntity.spec,
      lifecycle: 'production',
    };

    const serviceDefinition = defaultSerializer(mockedEntity);

    expect(serviceDefinition).toBeDefined();
    expect(serviceDefinition.spec?.lifecycle).toBe('production');
  });

  it('should add backstage labels as tags', () => {
    mockedEntity.metadata.labels = { tag1: 'value1', tag2: 'value2' };

    const serviceDefinition = defaultSerializer(mockedEntity);

    const tags = serviceDefinition.metadata?.tags ?? [];

    expect(serviceDefinition).toBeDefined();
    expect(tags).toEqual(
      expect.arrayContaining(['tag1:value1', 'tag2:value2']),
    );
  });

  it('should the system name as a tag', () => {
    mockedEntity.metadata.labels = {};
    mockedEntity.spec = {
      ...mockedEntity.spec,
      system: 'mocked-system',
    };

    const serviceDefinition = defaultSerializer(mockedEntity, defaultExtraInfo);

    const tags = serviceDefinition.metadata?.tags ?? [];

    expect(serviceDefinition).toBeDefined();
    expect(tags).toContain('system:mocked-system');
  });

  it('should set the description', () => {
    mockedEntity.metadata.description = 'mocked-description';

    const serviceDefinition = defaultSerializer(mockedEntity);

    expect(serviceDefinition).toBeDefined();
    expect(serviceDefinition.metadata?.description).toBe('mocked-description');
  });

  it('should include links that are supported types', () => {
    mockedEntity.metadata.links = [
      {
        title: 'mocked-link',
        url: 'https://backstage/mocked',
        type: 'doc',
      },
    ];

    const serviceDefinition = defaultSerializer(mockedEntity, defaultExtraInfo);

    const links = serviceDefinition.metadata?.links ?? [];

    expect(serviceDefinition).toBeDefined();
    expect(links).toEqual(
      expect.arrayContaining([
        {
          name: 'mocked-link',
          type: 'doc',
          url: 'https://backstage/mocked',
        },
      ]),
    );
  });

  it('should include a link to backstage if the base url is provided', () => {
    mockedEntity.metadata.links = [];

    const serviceDefinition = defaultSerializer(mockedEntity, defaultExtraInfo);

    const links = serviceDefinition.metadata?.links ?? [];

    expect(serviceDefinition).toBeDefined();
    expect(links).toEqual(
      expect.arrayContaining([
        {
          name: 'Backstage',
          provider: 'backstage',
          type: 'doc',
          url: 'https://backstage/catalog/default/Component/mocked-service',
        },
      ]),
    );
  });

  it('should include a link to techdocs if they are defined', () => {
    mockedEntity.metadata.links = [];
    mockedEntity.metadata.annotations = {
      'backstage.io/techdocs-ref': './',
    };

    const serviceDefinition = defaultSerializer(mockedEntity, defaultExtraInfo);

    const links = serviceDefinition.metadata?.links ?? [];

    expect(serviceDefinition).toBeDefined();
    expect(links).toEqual(
      expect.arrayContaining([
        {
          name: 'TechDocs',
          provider: 'backstage',
          type: 'doc',
          url: 'https://backstage/docs/default/Component/mocked-service',
        },
      ]),
    );
  });

  it('should include code locations if source-location is defined', () => {
    mockedEntity.metadata.annotations = {
      'backstage.io/source-location':
        'url:https://github.com/organization/repository-name/tree/master/packages/package-name/',
    };

    const serviceDefinition = defaultSerializer(mockedEntity, defaultExtraInfo);

    expect(serviceDefinition).toBeDefined();
    expect(serviceDefinition.datadog).toEqual(
      expect.objectContaining({
        codeLocations: expect.arrayContaining([
          {
            repositoryURL: 'https://github.com/organization/repository-name',
            paths: expect.arrayContaining(['packages/package-name/**']),
          },
        ]),
      }),
    );
  });
});
