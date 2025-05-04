import type { FindGlobal, FindGlobalArgs, TypeWithID } from 'payload';

import { QueryCommand } from '@aws-sdk/client-dynamodb';

import type { DynamoDBAdapter } from '../index.js';

import { buildComplexQuery } from '../queries/buildComplexQuery.js';
import { getGlobal } from '../utilities/getGlobal.js';
import { transform } from '../utilities/transform.js';

export const findGlobal: FindGlobal = async function findGlobal<T = TypeWithID>(
  this: DynamoDBAdapter,
  args: FindGlobalArgs
): Promise<T> {
  const { slug: globalSlug, locale, select, where = {} } = args;

  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { globalConfig, tableInfo } = getGlobal({ adapter: this, globalSlug });

  // Build the query expression from the where clause using complex query builder
  const queryExpression = await buildComplexQuery({
    adapter: this,
    collectionSlug: globalSlug,
    fields: globalConfig.fields,
    locale,
    where: {
      ...where,
      globalType: { equals: globalSlug },
    },
  });

  // Handle field selection
  const projectionExpression = select
    ? buildProjectionExpression(select as unknown as string[])
    : undefined;

  const params = {
    TableName: tableInfo.name,
    ...queryExpression,
    Limit: 1,
    ProjectionExpression: projectionExpression,
  };

  const result = await this.client.send(new QueryCommand(params));

  if (!result.Items || result.Items.length === 0) {
    throw new Error(`Global with slug ${globalSlug} not found`);
  }

  return transform({
    adapter: this,
    data: result.Items[0] as Record<string, unknown>,
    fields: globalConfig.fields,
    operation: 'read',
  }) as unknown as T;
};

// Helper function to build projection expression from select
function buildProjectionExpression(select: string[]): string {
  return select.map((field) => `#${field}`).join(', ');
}
