import type { PayloadRequest, UpdateMany } from 'payload';

import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';

import type { DynamoDBAdapter } from '../index.js';

import { buildQuery } from '../queries/buildQuery.js';
import { getCollection } from '../utilities/getCollection.js';
import { transform } from '../utilities/transform.js';

const handleError = ({
  collection,
  error,
  req,
}: {
  collection: string;
  error: Error;
  req?: Partial<PayloadRequest>;
}) => {
  console.error(`Error updating documents in collection ${collection}:`, error);
  throw error;
};

export const updateMany: UpdateMany = async function updateMany(
  this: DynamoDBAdapter,
  {
    collection: collectionSlug,
    data,
    locale,
    options: optionsArgs = {},
    req,
    returning,
    select,
    where,
  }
) {
  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { collectionConfig, tableInfo } = getCollection({ adapter: this, collectionSlug });
  const fields = collectionConfig.fields;

  const query = await buildQuery({
    adapter: this,
    collectionSlug,
    fields: collectionConfig.flattenedFields,
    locale,
    where,
  });

  let results: any[] = [];

  transform({ adapter: this, data, fields, operation: 'write' });

  try {
    if (returning === false) {
      await this.client.send(
        new UpdateItemCommand({
          ExpressionAttributeNames: {
            '#data': 'data',
          },
          ExpressionAttributeValues: {
            ':data': { S: JSON.stringify(data) },
          },
          Key: query,
          TableName: tableInfo.name,
          UpdateExpression: 'SET #data = :data',
          ...optionsArgs,
        })
      );
      return null;
    } else {
      const response = await this.client.send(
        new UpdateItemCommand({
          ExpressionAttributeNames: {
            '#data': 'data',
          },
          ExpressionAttributeValues: {
            ':data': { S: JSON.stringify(data) },
          },
          Key: query,
          ReturnValues: 'ALL_NEW',
          TableName: tableInfo.name,
          UpdateExpression: 'SET #data = :data',
          ...optionsArgs,
        })
      );
      if (response.Attributes) {
        results.push(response.Attributes);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      handleError({ collection: collectionSlug, error, req });
    } else {
      throw error;
    }
  }

  if (results.length === 0) {
    return null;
  }

  results = results.map((result) => {
    transform({ adapter: this, data: result, fields, operation: 'read' });
    return result;
  });

  return results;
};
