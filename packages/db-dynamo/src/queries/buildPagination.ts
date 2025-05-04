import type { Payload } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

type BuildPaginationArgs = {
  adapter: DynamoDBAdapter;
  config: Payload;
  lastEvaluatedKey?: Record<string, any>;
  limit?: number;
  page?: number;
};

export const buildPagination = ({
  adapter,
  config,
  lastEvaluatedKey,
  limit = 10,
  page = 1,
}: BuildPaginationArgs): { ExclusiveStartKey?: Record<string, any>; Limit: number } => {
  const paginationParams: { ExclusiveStartKey?: Record<string, any>; Limit: number } = {
    Limit: limit,
  };

  // If we have a lastEvaluatedKey, use it for cursor-based pagination
  if (lastEvaluatedKey) {
    paginationParams.ExclusiveStartKey = lastEvaluatedKey;
  } else if (page > 1) {
    // For page-based pagination, we need to calculate the offset
    // Note: This is less efficient than cursor-based pagination
    // as it requires scanning through all previous items
    paginationParams.Limit = limit * page;
  }

  return paginationParams;
};

export const getPaginationInfo = ({
  items,
  lastEvaluatedKey,
  limit,
  page,
}: {
  items: any[];
  lastEvaluatedKey?: Record<string, any>;
  limit: number;
  page: number;
}): {
  docs: any[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
  nextPage: null | number;
  page: number;
  prevPage: null | number;
  totalDocs: number;
  totalPages: number;
} => {
  let docs = items;

  // For page-based pagination, we need to slice the results
  if (!lastEvaluatedKey && page > 1) {
    const start = (page - 1) * limit;
    docs = items.slice(start, start + limit);
  }

  const hasNextPage = items.length > limit;
  const hasPrevPage = page > 1;

  return {
    docs,
    hasNextPage,
    hasPrevPage,
    limit,
    nextPage: hasNextPage ? page + 1 : null,
    page,
    prevPage: hasPrevPage ? page - 1 : null,
    totalDocs: items.length,
    totalPages: Math.ceil(items.length / limit),
  };
};
