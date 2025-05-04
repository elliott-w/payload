import type { FindGlobalArgs } from 'payload/dist/database/types';

import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { GlobalWithSlug } from '../types.js';

import { formatError, generateGlobalKeys, TABLE_NAMES } from '../utilities/index.js';

export const findGlobal = async <T>(args: { client: any } & FindGlobalArgs): Promise<null | T> => {
  const { client, global } = args;

  try {
    const keys = generateGlobalKeys(global.slug);
    const command = new GetCommand({
      Key: {
        [keys.pk]: keys.pk,
        [keys.sk]: keys.sk,
      },
      TableName: TABLE_NAMES.GLOBALS,
    });

    const result = await client.send(command);
    return (result.Item || null) as null | T;
  } catch (error: unknown) {
    throw formatError(error);
  }
};
