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

  router.post('/serialize/:category', async ({ body, params }, response) => {
    const datadogSync = datadogSyncs.get(params.category);
    assert(
      datadogSync,
      new NotFoundError(
        `These was no Datadog catalog sync for the sync category ${params.category}`,
      ),
    );

    const entityFilter = parseEntityFilterParams(body);
    response.status(201).json(await datadogSync.sync(entityFilter, true));
  });

  return router;
}

function parseEntityFilterParams(body: unknown) {
  assert(
    validateRequestBodyFilter(body),
    new InputError(
      'The posted "entityFilter" property was not properly formatted.',
    ),
  );

  return body.entityFilter;
}

function validateRequestBodyFilter(
  body: unknown,
): body is { entityFilter: SingleEntityFilterQuery } {
  if (isObject(body) && 'entityFilter' in body) {
    const { entityFilter } = body;
    if (isObject(entityFilter)) {
      return true;
    }
  }

  return false;
}

function isObject(object: unknown) {
  return typeof object === 'object' && object !== null;
}
