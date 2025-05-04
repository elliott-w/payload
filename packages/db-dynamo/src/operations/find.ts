import type { Find, FindArgs, PaginatedDocs, TypeWithID } from 'payload';

import { ScanCommand } from '@aws-sdk/client-dynamodb';

import type { DynamoDBAdapter } from '../index.js';

import { buildQuery } from '../queries/buildQuery.js';
import { buildSortParam } from '../queries/buildSortParam.js';
import { getCollection } from '../utilities/getCollection.js';
import { transform } from '../utilities/transform.js';

export const find: Find = async function find<T = TypeWithID>(
  this: DynamoDBAdapter,
  args: FindArgs
): Promise<PaginatedDocs<T>> {
  const { collection: collectionSlug, limit = 10, page = 1, sort, where = {} } = args;

  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { collectionConfig, tableInfo } = getCollection({ adapter: this, collectionSlug });

  // Convert sort array to object format if needed
  const sortParam = Array.isArray(sort)
    ? sort.reduce((acc, field) => ({ ...acc, [field]: 'asc' }), {})
    : sort;

  const sortParams = buildSortParam({
    adapter: this,
    config: this.payload,
    fields: collectionConfig.fields,
    sort: sortParam,
  });

  // Build the query expression from the where clause
  const queryExpression = await buildQuery({
    adapter: this,
    collectionSlug,
    fields: collectionConfig.fields,
    where,
  });

  const params = {
    TableName: tableInfo.name,
    ...sortParams,
    ...queryExpression,
    ExclusiveStartKey: page > 1 ? this.lastEvaluatedKeys[collectionSlug]?.[page - 1] : undefined,
    Limit: limit,
  };

  const result = await this.client.send(new ScanCommand(params));

  if (!result.Items) {
    return {
      docs: [],
      hasNextPage: false,
      hasPrevPage: false,
      limit,
      nextPage: null,
      page,
      pagingCounter: 1,
      prevPage: null,
      totalDocs: 0,
      totalPages: 0,
    };
  }

  const docs = result.Items.map((item: any) => {
    const transformed = transform(item);
    return transformed as unknown as T;
  });

  // Store the last evaluated key for pagination
  if (result.LastEvaluatedKey) {
    if (!this.lastEvaluatedKeys[collectionSlug]) {
      this.lastEvaluatedKeys[collectionSlug] = {};
    }
    this.lastEvaluatedKeys[collectionSlug][page] = result.LastEvaluatedKey;
  }

  return {
    docs,
    hasNextPage: result.LastEvaluatedKey !== undefined,
    hasPrevPage: page > 1,
    limit,
    nextPage: result.LastEvaluatedKey ? page + 1 : null,
    page,
    pagingCounter: (page - 1) * limit + 1,
    prevPage: page > 1 ? page - 1 : null,
    totalDocs: result.Count || 0,
    totalPages: Math.ceil((result.Count || 0) / limit),
  };
};
