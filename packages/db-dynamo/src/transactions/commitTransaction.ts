import { APIError, type CommitTransaction } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

export const commitTransaction: CommitTransaction = async function commitTransaction(
  this: DynamoDBAdapter,
  id: number | Promise<number | string> | string
) {
  if (id instanceof Promise) {
    return;
  }

  if (!this.client) {
    throw new APIError('commitTransaction called while no connection to the database exists');
  }

  // Initialize sessions if not already initialized
  if (!this.sessions) {
    this.sessions = {};
  }

  const session = this.sessions[id];
  if (!session) {
    throw new APIError('No session found for transaction');
  }

  try {
    await session.resolve();
    delete this.sessions[id];
  } catch (error) {
    throw new APIError('Failed to commit transaction');
  }
};
