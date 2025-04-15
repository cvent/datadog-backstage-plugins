import { strict as assert } from 'node:assert';

import type { AuthService } from '@backstage/backend-plugin-api';
import type { EntityFilterQuery } from '@backstage/catalog-client';
import { CATALOG_FILTER_EXISTS } from '@backstage/catalog-client';
import {
  isComponentEntity,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import type { Entity } from '@backstage/catalog-model';
import type { catalogServiceRef } from '@backstage/plugin-catalog-node';
import type { EventParams, EventsService } from '@backstage/plugin-events-node';

import type { BaseScheduledSyncOptions } from '@cvent/backstage-plugin-datadog-entity-sync-node';
import type {
  DatadogServiceDefinition,
  datadogServiceDefinitionRef,
} from '@cvent/backstage-plugin-datadog-entity-sync-node';
import { BaseScheduledSync } from '@cvent/backstage-plugin-datadog-entity-sync-node';

import type { SyncConfig } from '../extensions';
import { serializeComponentToDatadogService } from '../transforms/serializeComponentToDatadogService';
import type { RateLimit } from '../utils/byChunk';
import { byChunkAsync } from '../utils/byChunk';

interface Clients {
  datadog: NonNullable<typeof datadogServiceDefinitionRef.T>;
  catalog: typeof catalogServiceRef.T;
  auth: AuthService;
  events: EventsService;
}

export type SingleEntityFilterQuery<FIlter = EntityFilterQuery> =
  FIlter extends Array<infer SingleFilter> ? SingleFilter : FIlter;

export interface DatadogServiceFromEntitySyncOptions<Preload = unknown>
  extends BaseScheduledSyncOptions,
    Omit<SyncConfig, 'schedule'> {
  serialize?: (entity: Entity, preload?: Preload) => DatadogServiceDefinition;
  preload?: (clients: Clients, entities: Entity[]) => Promise<Preload>;
}

export class DatadogServiceFromEntitySync<
  PreloadedData,
> extends BaseScheduledSync {
  readonly #clients: Clients;
  readonly #topicId: string;
  readonly #enabled?: boolean;

  #entityFilter: EntityFilterQuery = {
    kind: 'Component',
  };

  #rateLimit: RateLimit = {
    count: 300,
    interval: { hours: 1 },
  };

  constructor(
    clients: Clients,
    options: DatadogServiceFromEntitySyncOptions<PreloadedData>,
  ) {
    super({
      ...options,
      logger: options.logger.child({ syncEnabled: options.enabled }),
    });

    if (options.preload) this.preload = options.preload;
    if (options.serialize) this.serialize = options.serialize;
    this.#entityFilter = options.entityFilter ?? this.#entityFilter;
    this.#rateLimit = options.rateLimit ?? this.#rateLimit;
    this.#clients = clients;
    this.#enabled = options.enabled;
    this.#topicId = `datadog-entity-sync.${this.syncId}`;
    this.#clients.events.subscribe({
      id: this.syncId,
      topics: [this.#topicId],
      onEvent: this.eventSync.bind(this),
    });
  }

  async scheduledSync() {
    return void (await this.sync());
  }

  async eventSync(
    { eventPayload }: EventParams = {
      topic: this.#topicId,
      eventPayload: {},
    },
  ) {
    if (validateEventParams(eventPayload)) {
      return void this.sync(eventPayload.entityFilter, eventPayload.dryRun);
    }

    return void this.logger.warn(`Then event was is invalid.`);
  }

  async sync(filter: SingleEntityFilterQuery = {}, dryRun?: boolean) {
    const syncEnabled = Boolean(this.#enabled && dryRun);
    this.tracker.start(
      `A ${syncEnabled ? 'dry run' : 'live'} sync to datadog has started.`,
    );

    const entityFilterQuery = mergeEntityFilters(filter, this.#entityFilter);

    const { items: entities } = await this.#clients.catalog.getEntities(
      { filter: entityFilterQuery },
      { credentials: await this.#clients.auth.getOwnServiceCredentials() },
    );

    const preload = await this.preload(this.#clients, entities);

    this.tracker.log.info(`Syncing ${entities.length} entities to datadog.`);

    const syncedServices = await byChunkAsync(
      entities,
      this.#rateLimit,
      chunk => this.#syncEntities(chunk, preload, syncEnabled),
    );

    this.tracker.log.info(
      `Finished syncing ${syncedServices.length} services to datadog.`,
    );
    return syncedServices;
  }

  async *#syncEntities(
    entities: Entity[],
    preload?: PreloadedData,
    dryRun?: boolean,
  ) {
    for (const entity of [entities].flat()) {
      const logger = this.tracker.log.child({
        entityRef: stringifyEntityRef(entity),
      });
      try {
        const service = this.serialize(entity, preload);
        assert(
          service,
          `The entity ${entity.metadata.title ?? entity.metadata.name} was unable to be processed.`,
        );

        if (!this.#enabled || dryRun) {
          logger.info(
            `The entity ${entity.metadata.title ?? entity.metadata.name} was not synced due to the sync being disabled.`,
          );
          yield service;
        } else {
          yield await this.#clients.datadog.createOrUpdateServiceDefinitions({
            body: service,
          });
        }
      } catch (err) {
        if (err instanceof Error)
          logger.error(
            'An issue occurred with creating a datadog service definition.',
            err,
          );
      }
    }
  }

  protected async preload(
    _clients: Clients,
    _entities: Entity[],
  ): Promise<PreloadedData | undefined> {
    return void this.logger.debug('There was no preload function defined');
  }

  protected serialize(entity: Entity, _preload?: PreloadedData) {
    if (!isComponentEntity(entity)) return undefined;

    return serializeComponentToDatadogService(entity);
  }
}

function mergeEntityFilters(
  queryFilter: SingleEntityFilterQuery,
  configFilter: EntityFilterQuery,
) {
  return [configFilter].flat().map(filter => ({
    ...queryFilter,
    ...convertCatalogFilterExistsStringToSymbol(filter),
  }));
}

function convertCatalogFilterExistsStringToSymbol({
  ...filter
}: SingleEntityFilterQuery) {
  for (const [key, value] of Object.entries(filter)) {
    if (value === 'CATALOG_FILTER_EXISTS') {
      filter[key] = CATALOG_FILTER_EXISTS;
    }
  }

  return filter;
}

function validateEventParams(
  params: unknown,
): params is { entityFilter: SingleEntityFilterQuery; dryRun?: boolean } {
  if (isObject(params) && 'entityFilter' in params) {
    const { entityFilter } = params;
    if (isObject(entityFilter)) {
      return true;
    }
  }

  return false;
}

function isObject(object: unknown) {
  return typeof object === 'object' && object !== null;
}
