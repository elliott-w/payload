import { DynamoDBAdapter } from '../index.js';

describe('DynamoDBAdapter', () => {
  let adapter: DynamoDBAdapter;

  beforeEach(() => {
    adapter = new DynamoDBAdapter({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
      },
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      region: process.env.AWS_REGION || 'us-east-1',
    });
  });

  describe('constructor', () => {
    it('should create a new instance with default config', () => {
      const defaultAdapter = new DynamoDBAdapter();
      expect(defaultAdapter).toBeInstanceOf(DynamoDBAdapter);
    });

    it('should create a new instance with custom config', () => {
      const customAdapter = new DynamoDBAdapter({
        endpoint: 'http://custom-endpoint:8000',
        region: 'eu-west-1',
      });
      expect(customAdapter).toBeInstanceOf(DynamoDBAdapter);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await expect(adapter.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });
});
