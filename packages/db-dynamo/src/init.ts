import type { Payload } from 'payload';
import type { BaseDatabaseAdapter } from 'payload/database';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { connect } from './connect.js';
import { destroy } from './destroy.js';

export async function init(payload: Payload): Promise<BaseDatabaseAdapter> {
  const { config } = payload;

  // Initialize DynamoDB client
  const client = new DynamoDBClient({
    credentials: config.db?.credentials,
    endpoint: config.db?.endpoint,
    region: config.db?.region || 'us-east-1',
  });

  // Create DynamoDB Document Client for easier data handling
  const docClient = DynamoDBDocumentClient.from(client);

  // Connect to database and initialize collections
  await connect(docClient, config);

  return {
    client: docClient,
    destroy: () => destroy(docClient),
    // Add other required methods here as they are implemented
  };
}
