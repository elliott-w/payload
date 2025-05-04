import type { DynamoDBAdapter } from '../index.js';

type PaginationParams = {
  adapter: DynamoDBAdapter;
  collectionSlug: string;
  lastEvaluatedKey?: any;
  limit: number;
  page: number;
};

type PaginationResult = {
  ExclusiveStartKey?: any;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: null | number;
  pagingCounter: number;
  prevPage: null | number;
};

export const handlePagination = ({
  adapter,
  collectionSlug,
  lastEvaluatedKey,
  limit,
  page,
}: PaginationParams): PaginationResult => {
  // Initialize the collection's pagination state if it doesn't exist
  if (!adapter.lastEvaluatedKeys[collectionSlug]) {
    adapter.lastEvaluatedKeys[collectionSlug] = {};
  }

  // Store the last evaluated key for the current page
  if (lastEvaluatedKey) {
    adapter.lastEvaluatedKeys[collectionSlug][page] = lastEvaluatedKey;
  }

  // Get the last evaluated key for the requested page
  const exclusiveStartKey =
    page > 1 ? adapter.lastEvaluatedKeys[collectionSlug]?.[page - 1] : undefined;

  // Calculate pagination metadata
  const hasNextPage = Boolean(lastEvaluatedKey);
  const hasPrevPage = page > 1;
  const nextPage = hasNextPage ? page + 1 : null;
  const prevPage = hasPrevPage ? page - 1 : null;
  const pagingCounter = (page - 1) * limit + 1;

  return {
    ExclusiveStartKey: exclusiveStartKey,
    hasNextPage,
    hasPrevPage,
    nextPage,
    pagingCounter,
    prevPage,
  };
};

export const clearPaginationState = (adapter: DynamoDBAdapter, collectionSlug: string): void => {
  delete adapter.lastEvaluatedKeys[collectionSlug];
};

export const getPaginationMetadata = (
  count: number,
  page: number,
  limit: number,
  hasNextPage: boolean
): {
  limit: number;
  page: number;
  totalDocs: number;
  totalPages: number;
} => {
  return {
    limit,
    page,
    totalDocs: count,
    totalPages: Math.ceil(count / limit),
  };
};
