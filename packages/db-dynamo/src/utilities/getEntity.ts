import type { Collection, SanitizedCollectionConfig, SanitizedGlobalConfig } from 'payload';

import { APIError } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

interface TableInfo {
  name: string;
  schema: Record<string, unknown>;
  tableName: string;
}

export const getCollection = ({
  adapter,
  collectionSlug,
  versions = false,
}: {
  adapter: DynamoDBAdapter;
  collectionSlug: string;
  versions?: boolean;
}): {
  collectionConfig: SanitizedCollectionConfig;
  customIDType: Collection['customIDType'];
  tableInfo: TableInfo;
} => {
  const collection = adapter.payload.collections[collectionSlug];

  if (!collection) {
    throw new APIError(
      `ERROR: Failed to retrieve collection with the slug "${collectionSlug}". Does not exist.`
    );
  }

  if (versions) {
    const tableInfo = adapter.versions[collectionSlug];

    if (!tableInfo) {
      throw new APIError(
        `ERROR: Failed to retrieve collection version table info with the slug "${collectionSlug}". Does not exist.`
      );
    }

    return {
      collectionConfig: collection.config,
      customIDType: collection.customIDType,
      tableInfo,
    };
  }

  const tableInfo = adapter.collections[collectionSlug];

  if (!tableInfo) {
    throw new APIError(
      `ERROR: Failed to retrieve collection table info with the slug "${collectionSlug}". Does not exist.`
    );
  }

  return { collectionConfig: collection.config, customIDType: collection.customIDType, tableInfo };
};

type BaseGetGlobalArgs = {
  adapter: DynamoDBAdapter;
  globalSlug: string;
};

interface GetGlobal {
  (args: { versions?: false | undefined } & BaseGetGlobalArgs): {
    globalConfig: SanitizedGlobalConfig;
    tableInfo: TableInfo;
  };
  (args: { versions?: true } & BaseGetGlobalArgs): {
    globalConfig: SanitizedGlobalConfig;
    tableInfo: TableInfo;
  };
}

export const getGlobal: GetGlobal = ({ adapter, globalSlug, versions = false }) => {
  const globalConfig = adapter.payload.config.globals.find((each) => each.slug === globalSlug);

  if (!globalConfig) {
    throw new APIError(
      `ERROR: Failed to retrieve global with the slug "${globalSlug}". Does not exist.`
    );
  }

  if (versions) {
    const tableInfo = adapter.versions[globalSlug];

    if (!tableInfo) {
      throw new APIError(
        `ERROR: Failed to retrieve global version table info with the slug "${globalSlug}". Does not exist.`
      );
    }

    return { globalConfig, tableInfo };
  }

  const tableInfo = adapter.globals[globalSlug];

  if (!tableInfo) {
    throw new APIError(
      `ERROR: Failed to retrieve global table info with the slug "${globalSlug}". Does not exist.`
    );
  }

  return { globalConfig, tableInfo };
};
