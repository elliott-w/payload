import type { CreateArgs } from 'payload';

import { PutCommand } from '@aws-sdk/lib-dynamodb';

import type { CollectionWithSlug } from '../types.js';

import { formatError, generateCollectionKeys, TABLE_NAMES } from '../utilities/index.js';

export const create = async <T>(args: { client: any } & CreateArgs): Promise<T> => {
  const { client, collection, data } = args;
  const collectionWithSlug = { slug: collection } as CollectionWithSlug;

  try {
    const keys = generateCollectionKeys(collectionWithSlug.slug, String(data.id));
    const timestamp = new Date().toISOString();

    const item = {
      ...keys,
      ...data,
      collection: collectionWithSlug.slug,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const command = new PutCommand({
      ConditionExpression: 'attribute_not_exists(#pk) AND attribute_not_exists(#sk)',
      ExpressionAttributeNames: {
        '#pk': keys.pk,
        '#sk': keys.sk,
      },
      Item: item,
      TableName: TABLE_NAMES.COLLECTIONS,
    });

    await client.send(command);
    return item as T;
  } catch (error: unknown) {
    throw formatError(error);
  }
};
