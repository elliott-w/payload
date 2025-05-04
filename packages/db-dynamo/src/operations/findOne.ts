import type { FindOneArgs } from 'payload';

import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { CollectionWithSlug } from '../types.js';

import { formatError, generateCollectionKeys, TABLE_NAMES } from '../utilities/index.js';

export const findOne = async <T>(
  args: { client: any; collection: CollectionWithSlug; id: string } & FindOneArgs
): Promise<null | T> => {
  const { id, client, collection } = args;

  try {
    const keys = generateCollectionKeys(collection.slug, id);
    const command = new GetCommand({
      Key: {
        [keys.pk]: keys.pk,
        [keys.sk]: keys.sk,
      },
      TableName: TABLE_NAMES.COLLECTIONS,
    });

    const result = await client.send(command);
    return (result.Item || null) as null | T;
  } catch (error: unknown) {
    throw formatError(error);
  }
};
