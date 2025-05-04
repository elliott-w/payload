import type { CreateGlobalArgs } from 'payload/dist/database/types';

import { PutCommand } from '@aws-sdk/lib-dynamodb';

import type { GlobalWithSlug } from '../types.js';

import { formatError, generateGlobalKeys, TABLE_NAMES } from '../utilities/index.js';

export const createGlobal = async <T>(args: { client: any } & CreateGlobalArgs): Promise<T> => {
  const { client, data, global } = args;
  const globalWithSlug = global as GlobalWithSlug;

  try {
    const keys = generateGlobalKeys(globalWithSlug.slug);
    const timestamp = new Date().toISOString();

    const item = {
      ...keys,
      ...data,
      createdAt: timestamp,
      globalType: globalWithSlug.slug,
      updatedAt: timestamp,
    };

    const command = new PutCommand({
      ConditionExpression: 'attribute_not_exists(#pk) AND attribute_not_exists(#sk)',
      ExpressionAttributeNames: {
        '#pk': keys.pk,
        '#sk': keys.sk,
      },
      Item: item,
      TableName: TABLE_NAMES.GLOBALS,
    });

    await client.send(command);
    return item as T;
  } catch (error: unknown) {
    throw formatError(error);
  }
};
