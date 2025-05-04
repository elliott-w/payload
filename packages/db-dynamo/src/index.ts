import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  BaseDatabaseAdapter,
  BaseJob,
  CollectionSlug,
  CountArgs,
  CreateArgs,
  CreateGlobalArgs,
  CreateGlobalVersionArgs,
  CreateVersionArgs,
  DatabaseAdapterObj,
  DeleteManyArgs,
  DeleteOneArgs,
  FindArgs,
  FindGlobalArgs,
  FindGlobalVersionsArgs,
  FindOneArgs,
  FindVersionsArgs,
  GlobalSlug,
  Migration,
  PaginatedDocs,
  Payload,
  QueryDraftsArgs,
  TypeWithID,
  TypeWithVersion,
  UpdateGlobalArgs,
  UpdateGlobalVersionArgs,
  UpdateJobsArgs,
  UpdateManyArgs,
  UpdateOneArgs,
  UpdateVersionArgs,
} from 'payload';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createDatabaseAdapter, defaultBeginTransaction } from 'payload';

import type {
  DynamoDBAdapter,
  DynamoDBAdapterConfig,
  DynamoDBSession,
  TableInfo,
} from './types.js';

import { createConnection, destroyConnection } from './connect.js';
import { buildTableSchema } from './models/buildTableSchema.js';
import { create } from './operations/create.js';
import { createGlobal } from './operations/createGlobal.js';
import { beginTransaction } from './transactions/beginTransaction.js';
import { commitTransaction } from './transactions/commitTransaction.js';
import { rollbackTransaction } from './transactions/rollbackTransaction.js';
import { getTableName } from './utilities/getTableName.js';

// Remove duplicated TableInfo interface and export DynamoDBAdapter interface
export { DynamoDBAdapter };

export function dynamoDBAdapter({
  migrationDir: migrationDirArg = 'migrations',
  ...config
}: DynamoDBAdapterConfig = {}): DatabaseAdapterObj {
  function adapter({ payload }: { payload: Payload }) {
    let client: DynamoDBDocumentClient | null = null;
    const collections: Record<string, TableInfo> = {};
    const versions: Record<string, TableInfo> = {};
    const globals: Record<string, TableInfo> = {};
    const sessions: Record<string, DynamoDBSession> = {};
    const lastEvaluatedKeys: Record<string, Record<number, Record<string, any>>> = {};

    const getLastEvaluatedKey = async (collectionSlug: string, page: number) => {
      return lastEvaluatedKeys[collectionSlug]?.[page];
    };

    const setLastEvaluatedKey = async (
      collectionSlug: string,
      page: number,
      key: Record<string, any>
    ) => {
      if (!lastEvaluatedKeys[collectionSlug]) {
        lastEvaluatedKeys[collectionSlug] = {};
      }
      lastEvaluatedKeys[collectionSlug][page] = key;
    };

    return createDatabaseAdapter<DynamoDBAdapter>({
      name: 'dynamodb',
      allowAdditionalKeys: config.allowAdditionalKeys ?? true,
      autoPluralization: config.autoPluralization ?? true,
      client,
      collections,
      defaultIDType: 'text',
      getLastEvaluatedKey,
      globals,
      lastEvaluatedKeys,
      migrationDir: migrationDirArg,
      packageName: '@payloadcms/db-dynamo',
      payload,
      sessions,
      setLastEvaluatedKey,
      versions,

      // Transaction methods
      beginTransaction,
      commitTransaction,
      rollbackTransaction,

      // Connection methods
      connect: async () => {
        const dynamoClient = new DynamoDBClient({
          credentials: config.credentials,
          endpoint: config.endpoint,
          region: config.region || 'us-east-1',
        });
        client = await createConnection({
          collections,
          globals,
          versions,
        });
      },

      destroy: destroyConnection,

      // CRUD operations
      create: async <T>(args: CreateArgs): Promise<T> => {
        if (!client) {
          throw new Error('Client not initialized. Call connect() first.');
        }
        return create<T>({ ...args, client });
      },

      createGlobal: async <T>(args: CreateGlobalArgs): Promise<T> => {
        if (!client) {
          throw new Error('Client not initialized. Call connect() first.');
        }
        const global = {
          slug: args.slug as GlobalSlug,
        };
        return createGlobal<T>({ ...args, client, global });
      },

      // Placeholder implementations for other methods
      count: async (args: CountArgs): Promise<{ totalDocs: number }> => {
        throw new Error('Method not implemented.');
      },
      countGlobalVersions: async (args: any): Promise<{ totalDocs: number }> => {
        throw new Error('Method not implemented.');
      },
      countVersions: async (args: any): Promise<{ totalDocs: number }> => {
        throw new Error('Method not implemented.');
      },
      createGlobalVersion: async <T>(args: CreateGlobalVersionArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      createMigration: async (args: any): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      createVersion: async <T>(args: CreateVersionArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      deleteMany: async (args: DeleteManyArgs): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      deleteOne: async <T>(args: DeleteOneArgs): Promise<null | T> => {
        throw new Error('Method not implemented.');
      },
      deleteVersions: async (args: any): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      find: async <T>(args: FindArgs): Promise<PaginatedDocs<T>> => {
        throw new Error('Method not implemented.');
      },
      findGlobal: async <T>(args: FindGlobalArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      findGlobalVersions: async <T>(
        args: FindGlobalVersionsArgs
      ): Promise<PaginatedDocs<TypeWithVersion<T>>> => {
        throw new Error('Method not implemented.');
      },
      findOne: async <T>(args: FindOneArgs): Promise<null | T> => {
        throw new Error('Method not implemented.');
      },
      findVersions: async <T>(
        args: FindVersionsArgs
      ): Promise<PaginatedDocs<TypeWithVersion<T>>> => {
        throw new Error('Method not implemented.');
      },
      migrate: async (args?: { migrations?: any[] }): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      migrateDown: async (): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      migrateFresh: async (args: { forceAcceptWarning?: boolean }): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      migrateRefresh: async (): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      migrateReset: async (): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      migrateStatus: async (): Promise<void> => {
        throw new Error('Method not implemented.');
      },
      queryDrafts: async <T>(args: QueryDraftsArgs): Promise<PaginatedDocs<T>> => {
        throw new Error('Method not implemented.');
      },
      updateGlobal: async <T>(args: UpdateGlobalArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      updateGlobalVersion: async <T>(args: UpdateGlobalVersionArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      updateJobs: async (args: UpdateJobsArgs): Promise<BaseJob[] | null> => {
        throw new Error('Method not implemented.');
      },
      updateMany: async (args: UpdateManyArgs): Promise<any[] | null> => {
        throw new Error('Method not implemented.');
      },
      updateOne: async <T>(args: UpdateOneArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      updateVersion: async <T>(args: UpdateVersionArgs): Promise<T> => {
        throw new Error('Method not implemented.');
      },
      upsert: async (args: any): Promise<void> => {
        throw new Error('Method not implemented.');
      },
    });
  }

  return {
    name: 'dynamodb',
    defaultIDType: 'text',
    init: adapter,
  };
}

export * from './types.js';
