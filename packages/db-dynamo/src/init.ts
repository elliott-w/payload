import type {
  BaseDatabaseAdapter,
  Payload,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig,
} from 'payload';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { createConnection } from './connect.js';
import { buildCollectionSchema } from './models/buildCollectionSchema.js';
import { getTableName } from './utilities/getTableName.js';

interface DynamoDBConfig {
  autoPluralization?: boolean;
  collectionsSchemaOptions?: Record<string, any>;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  region?: string;
}

interface TableInfo {
  name: string;
  schema: {
    AttributeDefinitions: Array<{
      AttributeName: string;
      AttributeType: 'B' | 'N' | 'S';
    }>;
    BillingMode: 'PAY_PER_REQUEST';
    GlobalSecondaryIndexes?: Array<{
      IndexName: string;
      KeySchema: Array<{
        AttributeName: string;
        KeyType: 'HASH' | 'RANGE';
      }>;
      Projection: {
        NonKeyAttributes?: string[];
        ProjectionType: 'ALL' | 'INCLUDE' | 'KEYS_ONLY';
      };
    }>;
    KeySchema: Array<{
      AttributeName: string;
      KeyType: 'HASH' | 'RANGE';
    }>;
  };
  tableName: string;
}

interface DynamoDBAdapter extends BaseDatabaseAdapter {
  autoPluralization: boolean;
  client: DynamoDBDocumentClient;
  collections: Record<string, TableInfo>;
  collectionsSchemaOptions?: Record<string, any>;
  globals: Record<string, TableInfo>;
  versions: Record<string, TableInfo>;
}

export async function init(payload: Payload): Promise<DynamoDBAdapter> {
  const { config } = payload;
  const dbConfig = config.db as DynamoDBConfig;

  // Initialize DynamoDB client
  const client = new DynamoDBClient({
    credentials: dbConfig?.credentials,
    endpoint: dbConfig?.endpoint,
    region: dbConfig?.region || 'us-east-1',
  });

  // Create DynamoDB Document Client for easier data handling
  const docClient = DynamoDBDocumentClient.from(client);

  // Initialize collections
  const collections: Record<string, TableInfo> = {};
  const versions: Record<string, TableInfo> = {};
  const globals: Record<string, TableInfo> = {};

  // Process each collection
  payload.config.collections.forEach((collection: SanitizedCollectionConfig) => {
    const tableName = getTableName({ config: collection });
    const schemaOptions = dbConfig.collectionsSchemaOptions?.[collection.slug];

    // Store collection info with schema
    collections[collection.slug] = {
      name: collection.slug,
      schema: buildCollectionSchema({ config: collection }),
      tableName,
    };

    // Handle version collections if enabled
    if (collection.versions) {
      const versionTableName = getTableName({ config: collection, versions: true });

      versions[collection.slug] = {
        name: `${collection.slug}_versions`,
        schema: buildCollectionSchema({ config: collection, isVersion: true }),
        tableName: versionTableName,
      };
    }
  });

  // Process globals
  payload.config.globals.forEach((global) => {
    const tableName = getTableName({ config: global });

    globals[global.slug] = {
      name: global.slug,
      schema: buildCollectionSchema({ config: global }),
      tableName,
    };

    // Handle global versions if enabled
    if (global.versions) {
      const versionTableName = getTableName({ config: global, versions: true });

      versions[global.slug] = {
        name: `${global.slug}_versions`,
        schema: buildCollectionSchema({ config: global, isVersion: true }),
        tableName: versionTableName,
      };
    }
  });

  // Connect to database and initialize tables
  await createConnection({
    collections,
    globals,
    versions,
  });

  return {
    autoPluralization: dbConfig.autoPluralization ?? true,
    client: docClient,
    collections,
    collectionsSchemaOptions: dbConfig.collectionsSchemaOptions,
    destroy: async () => {
      // Cleanup logic here
    },
    globals,
    versions,
  } as DynamoDBAdapter;
}
