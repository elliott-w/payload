import type { Find, FindArgs, JoinQuery, PaginatedDocs, SelectType, TypeWithID } from 'payload';

import { BatchGetItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

import type { DynamoDBAdapter } from '../index.js';

import { buildComplexQuery } from '../queries/buildComplexQuery.js';
import { buildSortParam } from '../queries/buildSortParam.js';
import { getCollection } from '../utilities/getCollection.js';
import { getPaginationMetadata, handlePagination } from '../utilities/pagination.js';
import { transform } from '../utilities/transform.js';

export const find: Find = async function find<T = TypeWithID>(
  this: DynamoDBAdapter,
  args: FindArgs
): Promise<PaginatedDocs<T>> {
  const {
    collection: collectionSlug,
    draftsEnabled,
    joins = {},
    limit = 10,
    locale,
    page = 1,
    select,
    sort,
    where = {},
  } = args;

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

  // Build the query expression from the where clause using complex query builder
  const queryExpression = await buildComplexQuery({
    adapter: this,
    collectionSlug,
    fields: collectionConfig.fields,
    locale,
    where,
  });

  // Handle field selection
  const projectionExpression = select
    ? buildProjectionExpression(select as unknown as string[])
    : undefined;

  // Determine if we should use Query or Scan based on the query conditions
  const useQuery = canUseQuery(queryExpression, sortParams);

  // Get pagination parameters
  const pagination = handlePagination({
    adapter: this,
    collectionSlug,
    limit,
    page,
  });

  const params = {
    TableName: tableInfo.name,
    ...sortParams,
    ...queryExpression,
    ExclusiveStartKey: pagination.ExclusiveStartKey,
    Limit: limit,
    ProjectionExpression: projectionExpression,
    ...(draftsEnabled
      ? { FilterExpression: 'attribute_not_exists(_status) OR _status = :published' }
      : {}),
  };

  if (draftsEnabled) {
    params.ExpressionAttributeValues = {
      ...params.ExpressionAttributeValues,
      ':published': { S: 'published' },
    };
  }

  let result;
  if (useQuery) {
    result = await this.client.send(new QueryCommand(params));
  } else {
    result = await this.client.send(new ScanCommand(params));
  }

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

  // Handle joins if specified
  let docs = result.Items.map((item: any) => {
    const transformed = transform(item);
    return transformed as unknown as T;
  });

  if (Object.keys(joins).length > 0) {
    docs = await processJoins(this, docs, joins as Record<string, any>, collectionConfig);
  }

  // Update pagination state with the last evaluated key
  handlePagination({
    adapter: this,
    collectionSlug,
    lastEvaluatedKey: result.LastEvaluatedKey,
    limit,
    page,
  });

  // Get pagination metadata
  const paginationMetadata = getPaginationMetadata(
    result.Count || 0,
    page,
    limit,
    Boolean(result.LastEvaluatedKey)
  );

  return {
    docs,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    limit,
    nextPage: pagination.nextPage,
    page,
    pagingCounter: pagination.pagingCounter,
    prevPage: pagination.prevPage,
    totalDocs: paginationMetadata.totalDocs,
    totalPages: paginationMetadata.totalPages,
  };
};

// Helper function to build projection expression from select
function buildProjectionExpression(select: string[]): string {
  return select.map((field) => `#${field}`).join(', ');
}

// Helper function to determine if we can use Query instead of Scan
function canUseQuery(queryExpression: any, sortParams: any): boolean {
  // We can use Query if:
  // 1. We have a KeyConditionExpression (primary key condition)
  // 2. The sort key matches our sort parameters
  return Boolean(
    queryExpression.KeyConditionExpression &&
      (!sortParams.IndexName || sortParams.IndexName === 'primary')
  );
}

// Helper function to process joins
async function processJoins(
  adapter: DynamoDBAdapter,
  docs: any[],
  joins: Record<string, any>,
  collectionConfig: any
): Promise<any[]> {
  const joinPromises = Object.entries(joins).map(async ([relation, joinConfig]) => {
    const relationField = collectionConfig.fields.find((f: any) => f.name === relation);
    if (!relationField) {
      return;
    }

    const relatedCollection = relationField.relationTo;
    if (!relatedCollection) {
      return;
    }

    const relatedIds = docs
      .map((doc) => doc[relation])
      .filter(Boolean)
      .flat();

    if (relatedIds.length === 0) {
      return;
    }

    const { tableInfo } = getCollection({ adapter, collectionSlug: relatedCollection });

    if (!adapter.client) {
      throw new Error('DynamoDB client not initialized');
    }

    const batchGetParams = {
      RequestItems: {
        [tableInfo.name]: {
          Keys: relatedIds.map((id) => ({ id: { S: id } })),
        },
      },
    };

    const result = await adapter.client.send(new BatchGetItemCommand(batchGetParams));
    const relatedDocs = result.Responses?.[tableInfo.name] || [];

    // Map related docs to their IDs for quick lookup
    const relatedDocsMap = relatedDocs.reduce((acc: Record<string, any>, doc: any) => {
      const transformed = transform(doc) as any;
      if (transformed?.id) {
        acc[transformed.id] = transformed;
      }
      return acc;
    }, {});

    // Update original docs with related data
    docs.forEach((doc) => {
      if (doc[relation]) {
        doc[relation] = Array.isArray(doc[relation])
          ? doc[relation].map((id) => relatedDocsMap[id])
          : relatedDocsMap[doc[relation]];
      }
    });
  });

  await Promise.all(joinPromises);
  return docs;
}
