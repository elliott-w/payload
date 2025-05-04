import type {
  BaseDatabaseAdapter,
  Payload,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig,
} from 'payload';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { createConnection } from './connect.js';
import { buildTableSchema } from './models/buildTableSchema.js';
import { getTableName } from './utilities/getTableName.js';

interface DynamoDBConfig {
  autoPluralization?: boolean;
  collectionsSchemaOptions?: Record<string, Record<string, unknown>>;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  region?: string;
}

interface TableInfo {
  name: string;
  schema: Record<string, unknown>;
  tableName: string;
}

interface DynamoDBAdapter extends BaseDatabaseAdapter {
  autoPluralization: boolean;
  client: DynamoDBDocumentClient;
  collections: Record<string, TableInfo>;
  globals: Record<string, TableInfo>;
  versions: Record<string, TableInfo>;
}

// Helper function to build table schema for globals
function buildGlobalTableSchema(
  global: SanitizedGlobalConfig,
  payload: Payload,
  schemaOptions: Record<string, unknown> = {}
): Record<string, unknown> {
  // Convert global to collection-like structure for schema building
  const collectionLikeConfig: SanitizedCollectionConfig = {
    ...global,
    access: {
      admin: () => true,
      create: () => true,
      delete: () => true,
      read: global.access?.read || (() => true),
      readVersions: () => true,
      unlock: () => true,
      update: global.access?.update || (() => true),
    },
    admin: {
      ...global.admin,
      baseListFilter: () => ({}),
      components: {
        ...global.admin?.components,
        afterList: [],
        beforeList: [],
        beforeListTable: [],
        beforeListTableRow: [],
        beforeListTableRowCell: [],
        beforeListTableRowCellContent: [],
        views: {
          edit: {
            actions: [],
            Component: 'Edit',
            meta: {
              defaultOGImageType: 'off',
              metadataBase: null,
              titleSuffix: '',
            },
          },
          list: {
            actions: [],
            Component: 'List',
          },
        },
      },
      defaultColumns: ['id', 'createdAt', 'updatedAt'],
      disableCopyToLocale: false,
      enableRichTextLink: false,
      enableRichTextRelationship: false,
      group: false,
      hidden: false,
      hideAPIURL: false,
      listSearchableFields: [],
      pagination: {
        defaultLimit: 10,
        limits: [10, 20, 50, 100],
      },
      useAsTitle: 'id',
    },
    auth: {} as any,
    defaultPopulate: {},
    defaultSort: '-createdAt',
    disableDuplicate: false,
    enableQueryPresets: false,
    endpoints: [],
    indexes: [],
    joins: {},
    labels: {
      plural: global.label,
      singular: global.label,
    },
    orderable: false,
    polymorphicJoins: [],
    sanitizedIndexes: [],
    timestamps: true,
    upload: {} as any,
    versions: {
      ...global.versions,
      maxPerDoc: 100,
    } as any,
  };

  return buildTableSchema({
    collection: collectionLikeConfig,
    payload,
    schemaOptions,
  });
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
    const schemaOptions = dbConfig.collectionsSchemaOptions?.[collection.slug] || {};

    // Build the table schema for the collection
    const schema = buildTableSchema({
      collection,
      payload,
      schemaOptions,
    });

    const tableName = getTableName({ config: collection });

    // Store collection info
    collections[collection.slug] = {
      name: collection.slug,
      schema,
      tableName,
    };

    // Handle version collections if enabled
    if (collection.versions) {
      const versionTableName = getTableName({ config: collection, versions: true });

      // Build version table schema
      const versionSchema = buildTableSchema({
        collection,
        payload,
        schemaOptions: {
          isVersion: true,
        },
      });

      versions[collection.slug] = {
        name: `${collection.slug}_versions`,
        schema: versionSchema,
        tableName: versionTableName,
      };
    }
  });

  // Process globals
  payload.config.globals.forEach((global) => {
    const tableName = getTableName({ config: global });

    // Build global table schema
    const schema = buildGlobalTableSchema(global, payload);

    globals[global.slug] = {
      name: global.slug,
      schema,
      tableName,
    };

    // Handle global versions if enabled
    if (global.versions) {
      const versionTableName = getTableName({ config: global, versions: true });

      // Build global version table schema
      const versionSchema = buildGlobalTableSchema(global, payload, {
        isVersion: true,
      });

      versions[global.slug] = {
        name: `${global.slug}_versions`,
        schema: versionSchema,
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
    destroy: async () => {
      // Cleanup logic here
    },
    globals,
    versions,
  } as DynamoDBAdapter;
}
