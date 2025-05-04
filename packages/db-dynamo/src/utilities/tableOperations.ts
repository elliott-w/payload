import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';

import { formatError } from './formatError.js';

export const TABLE_NAMES = {
  COLLECTIONS: 'payload_collections',
  GLOBALS: 'payload_globals',
} as const;

export const ensureTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  keySchema: any[],
  attributeDefinitions: any[]
): Promise<void> => {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await client.send(command);
  } catch (error: unknown) {
    if ((error as any).name === 'ResourceNotFoundException') {
      await createTable(client, tableName, keySchema, attributeDefinitions);
    } else {
      throw formatError(error);
    }
  }
};

export const createTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  keySchema: any[],
  attributeDefinitions: any[]
): Promise<void> => {
  try {
    const command = new CreateTableCommand({
      AttributeDefinitions: attributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: keySchema,
      TableName: tableName,
    });

    await client.send(command);

    // Wait for table to be created
    await waitForTable(client, tableName);
  } catch (error: unknown) {
    throw formatError(error);
  }
};

export const deleteTable = async (
  client: DynamoDBDocumentClient,
  tableName: string
): Promise<void> => {
  try {
    const command = new DeleteTableCommand({ TableName: tableName });
    await client.send(command);
  } catch (error: unknown) {
    throw formatError(error);
  }
};

const waitForTable = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  maxAttempts = 10
): Promise<void> => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await client.send(command);

      if (response.Table?.TableStatus === 'ACTIVE') {
        return;
      }
    } catch (error: unknown) {
      throw formatError(error);
    }

    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Table ${tableName} did not become active within ${maxAttempts} attempts`);
};
