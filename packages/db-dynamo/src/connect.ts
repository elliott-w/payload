import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import type { DynamoDBAdapterConfig, DynamoDBError } from './types.js';

let client: DynamoDBDocumentClient | null = null;

export const connect = async (config: DynamoDBAdapterConfig): Promise<DynamoDBDocumentClient> => {
  if (client) {
    return client;
  }

  try {
    const dynamoDBClient = new DynamoDBClient({
      credentials: config.credentials,
      endpoint: config.endpoint,
      region: config.region || 'us-east-1',
    });

    client = DynamoDBDocumentClient.from(dynamoDBClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });

    return client;
  } catch (error: unknown) {
    const dbError = error as DynamoDBError;
    throw new Error(`Failed to connect to DynamoDB: ${dbError.message}`);
  }
};

export const destroy = async (): Promise<void> => {
  if (client) {
    await client.destroy();
    client = null;
  }
};
