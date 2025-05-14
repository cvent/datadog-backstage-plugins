import assert from 'node:assert/strict';

import express from 'express';
import Router from 'express-promise-router';

import { InputError, NotFoundError } from '@backstage/errors';

import type {
  DatadogServiceFromEntitySync,
  SingleEntityFilterQuery,
} from '@cvent/backstage-plugin-datadog-entity-sync-node';

export async function createRouter({
  datadogSyncs,
}: {
  datadogSyncs: Map<string, DatadogServiceFromEntitySync<unknown>>;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/serialize/:category', async ({ params, query }, response) => {
    const datadogSync = datadogSyncs.get(params.category);
    assert(
      datadogSync,
      new NotFoundError(
        `These was no Datadog catalog sync for the sync category ${params.category}`,
      ),
    );

    // Extract the filter parameter and parse it into a structured query object
    const filterParam = String(query.entityFilter || '').trim();
    const entityFilter = parseEntityFilterString(filterParam);

    response.status(200).json(await datadogSync.sync(entityFilter, true));
  });

  return router;
}

/**
 * Takes in a filter string and parses it into a SingleEntityFilterQuery object.
 *
 * This filter string is a subset of an entity filter query in the format of `<key>=<value>,<key>=<value>`.
 *
 * @example  Below is an example of a filter string:
 * 'metadata.name=service-name,kind=application' would result in { 'metadata.name': 'service-name', 'kind': 'application' }
 *
 * @param filterString - The string to parse in format 'key1=value1,key2=value2'
 * @returns A SingleEntityFilterQuery object with key-value pairs
 */
export function parseEntityFilterString(
  searchString: string,
): SingleEntityFilterQuery {
  if (!searchString) {
    return {};
  }

  return searchString
    .split(',')
    .map(segment => segment.trim())
    .filter(Boolean)
    .reduce((result, keyValuePair) => {
      const [property, value] = keyValuePair
        .split('=')
        .map(part => part.trim());

      assert(
        property,
        new InputError(
          `Invalid filter format: '${keyValuePair}'. Expected format is 'key=value'`,
        ),
      );

      result[property] = value ?? '';
      return result;
    }, {} as SingleEntityFilterQuery);
}
