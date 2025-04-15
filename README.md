# [Datadog](https://www.datadoghq.com) plugin for [Backstage](https://backstage.io)

A set of datadog backstage plugins to help integrate a Backstage catalog and Datadog service catalog together.

## Features
* **[Sync a Backstage catalog to Datadog](./plugins/datadog-entity-sync-backend)**
  : Configure a serializer
  to take a backstage entity, convert it to a Datadog service definition, and [upsert it to Datadog](https://docs.datadoghq.com/api/latest/service-definition/#create-or-update-service-definition). *Currently ony using the v2 scheme. v3 support will be coming shortly*

## Getting Started

See the installation [instructions](./plugins/datadog-entity-sync-backend#installation) and [customization](./plugins/datadog-entity-sync-backend#customization) in the `datadog-entity-sync-backend` [plugin](./plugins/datadog-entity-sync-backend#installation) for more details.