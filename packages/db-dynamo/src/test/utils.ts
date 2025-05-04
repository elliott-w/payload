import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';

import { testDynamoDBClient } from './setup.js';

interface DynamoDBError extends Error {
  name: string;
}

export const createTestTable = async (
  tableName: string,
  keySchema: any,
  attributeDefinitions: any
) => {
  try {
    await testDynamoDBClient.send(
      new CreateTableCommand({
        AttributeDefinitions: attributeDefinitions,
        KeySchema: keySchema,
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
        TableName: tableName,
      })
    );
  } catch (error) {
    const dynamoError = error as DynamoDBError;
    if (dynamoError.name !== 'ResourceInUseException') {
      throw error;
    }
  }
};

export const deleteTestTable = async (tableName: string) => {
  try {
    await testDynamoDBClient.send(
      new DeleteTableCommand({
        TableName: tableName,
      })
    );
  } catch (error) {
    const dynamoError = error as DynamoDBError;
    if (dynamoError.name !== 'ResourceNotFoundException') {
      throw error;
    }
  }
};

export const listTables = async () => {
  const result = await testDynamoDBClient.send(new ListTablesCommand({}));
  return result.TableNames || [];
};

export const waitForTable = async (tableName: string, timeout = 10000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const tables = await listTables();
    if (tables.includes(tableName)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Table ${tableName} not created within ${timeout}ms`);
};
