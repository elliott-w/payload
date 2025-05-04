import type { PayloadRequest, UpdateOne } from 'payload';

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
  console.error(`Error updating document in collection ${collection}:`, error);
  throw error;
};

export const updateOne: UpdateOne = async function updateOne(
  this: DynamoDBAdapter,
  {
    id,
    collection: collectionSlug,
    data,
    locale,
    options: optionsArgs = {},
    req,
    returning,
    select,
    where: whereArg = {},
  }
) {
  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { collectionConfig, tableInfo } = getCollection({ adapter: this, collectionSlug });
  const where = id ? { id: { equals: id } } : whereArg;
  const fields = collectionConfig.fields;

  const query = await buildQuery({
    adapter: this,
    collectionSlug,
    fields: collectionConfig.flattenedFields,
    locale,
    where,
  });

  let result;

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
      result = response.Attributes;
    }
  } catch (error) {
    if (error instanceof Error) {
      handleError({ collection: collectionSlug, error, req });
    } else {
      throw error;
    }
  }

  if (!result) {
    return null;
  }

  transform({ adapter: this, data: result, fields, operation: 'read' });

  return result;
};
