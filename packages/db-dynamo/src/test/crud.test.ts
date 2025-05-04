import type { TypeWithID } from 'payload';

import { dynamoDBAdapter } from '../index.js';
import { TEST_TABLE_NAME } from './setup.js';

interface TestDocument extends TypeWithID {
  content: string;
  title: string;
}

describe('DynamoDBAdapter CRUD Operations', () => {
  let adapter: any;

  beforeEach(async () => {
    const adapterFactory = dynamoDBAdapter({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
      },
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      region: process.env.AWS_REGION || 'us-east-1',
    });

    adapter = adapterFactory.init({ payload: {} as any });
    await adapter.connect();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.connect();
    }
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const result = await adapter.create({
        collection: 'test',
        data: {
          content: 'This is a test document',
          title: 'Test Document',
        },
      });

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Test Document');
      expect(result.content).toBe('This is a test document');
    });
  });

  describe('findOne', () => {
    it('should find a document by ID', async () => {
      const created = await adapter.create({
        collection: 'test',
        data: {
          content: 'This is a test document',
          title: 'Test Document',
        },
      });

      const found = await adapter.findOne({
        collection: 'test',
        where: {
          id: {
            equals: created.id,
          },
        },
      });

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test Document');
    });
  });

  describe('updateOne', () => {
    it('should update a document', async () => {
      const created = await adapter.create({
        collection: 'test',
        data: {
          content: 'This is a test document',
          title: 'Test Document',
        },
      });

      const updated = await adapter.updateOne({
        collection: 'test',
        data: {
          title: 'Updated Document',
        },
        where: {
          id: {
            equals: created.id,
          },
        },
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.title).toBe('Updated Document');
      expect(updated?.content).toBe('This is a test document');
    });
  });

  describe('deleteOne', () => {
    it('should delete a document', async () => {
      const created = await adapter.create({
        collection: 'test',
        data: {
          content: 'This is a test document',
          title: 'Test Document',
        },
      });

      await adapter.deleteOne({
        collection: 'test',
        where: {
          id: {
            equals: created.id,
          },
        },
      });

      const found = await adapter.findOne({
        collection: 'test',
        where: {
          id: {
            equals: created.id,
          },
        },
      });

      expect(found).toBeNull();
    });
  });
});
