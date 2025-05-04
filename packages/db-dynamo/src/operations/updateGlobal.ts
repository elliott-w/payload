import type { PayloadRequest, UpdateGlobal, UpdateGlobalArgs } from 'payload';

import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';

import type { DynamoDBAdapter } from '../index.js';

import { getGlobal } from '../utilities/getGlobal.js';
import { transform } from '../utilities/transform.js';

const handleError = ({
  error,
  global: globalSlug,
  req,
}: {
  error: Error;
  global: string;
  req?: Partial<PayloadRequest>;
}) => {
  console.error(`Error updating global ${globalSlug}:`, error);
  throw error;
};

export const updateGlobal: UpdateGlobal = async function updateGlobal<
  T extends Record<string, unknown> = any,
>(
  this: DynamoDBAdapter,
  { slug: globalSlug, data, options: optionsArgs = {}, req, returning, select }: UpdateGlobalArgs<T>
): Promise<T> {
  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { globalConfig, tableInfo } = getGlobal({ adapter: this, globalSlug });
  const fields = globalConfig.fields;

  transform({ adapter: this, data, fields, globalSlug, operation: 'write' });

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
          Key: { id: { S: globalSlug } },
          TableName: tableInfo.name,
          UpdateExpression: 'SET #data = :data',
          ...optionsArgs,
        })
      );
      return data;
    }

    const response = await this.client.send(
      new UpdateItemCommand({
        ExpressionAttributeNames: {
          '#data': 'data',
        },
        ExpressionAttributeValues: {
          ':data': { S: JSON.stringify(data) },
        },
        Key: { id: { S: globalSlug } },
        ReturnValues: 'ALL_NEW',
        TableName: tableInfo.name,
        UpdateExpression: 'SET #data = :data',
        ...optionsArgs,
      })
    );

    if (!response.Attributes?.data?.S) {
      throw new Error(`Failed to update global ${globalSlug}`);
    }

    const result = JSON.parse(response.Attributes.data.S) as T;
    transform({ adapter: this, data: result, fields, globalSlug, operation: 'read' });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      handleError({ error, global: globalSlug, req });
    }
    throw error;
  }
};
