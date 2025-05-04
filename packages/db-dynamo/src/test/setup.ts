import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

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
  // Add any setup that needs to run before all tests
});

afterAll(async () => {
  // Add any cleanup that needs to run after all tests
});
