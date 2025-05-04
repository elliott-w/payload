import type { DynamoDBError } from '../types.js';

export const formatError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  const dbError = error as DynamoDBError;
  return new Error(dbError.message || 'Unknown DynamoDB error');
};
