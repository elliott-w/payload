import type { BaseDatabaseAdapter, Payload } from 'payload';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { connect } from './connect.js';

interface DynamoDBConfig {
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  region?: string;
}

interface DynamoDBAdapter extends BaseDatabaseAdapter {
  client: DynamoDBDocumentClient;
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

  // Connect to database and initialize collections
  await connect(docClient);

  return {
    client: docClient,
    destroy: async () => {
      // Cleanup logic here
    },
  } as DynamoDBAdapter;
}
