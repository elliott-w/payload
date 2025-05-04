import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { createTestTable, deleteTestTable } from './utils.js';

export const TEST_TABLE_NAME = 'payload-test';

// Configure DynamoDB client for testing
export const testDynamoDBClient = new DynamoDBClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: process.env.AWS_REGION || 'us-east-1',
});

// Add any global test setup here
beforeAll(async () => {
  // Create test table
  await createTestTable(
    TEST_TABLE_NAME,
    [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ]
  );
});

afterAll(async () => {
  // Clean up test table
  await deleteTestTable(TEST_TABLE_NAME);
});
