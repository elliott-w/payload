import { APIError, type BeginTransaction } from 'payload';
import { v4 as uuid } from 'uuid';

import type { DynamoDBAdapter } from '../index.js';

export const beginTransaction: BeginTransaction = async function beginTransaction(
  this: DynamoDBAdapter
) {
  if (!this.client) {
    throw new APIError('beginTransaction called while no connection to the database exists');
  }

  const id = uuid();

  // Initialize sessions if not already initialized
  if (!this.sessions) {
    this.sessions = {};
  }

  if (!this.sessions[id]) {
    this.sessions[id] = {
      db: this.client,
      inTransaction: () => true,
      reject: async () => {
        // Implementation will be added later
      },
      resolve: async () => {
        // Implementation will be added later
      },
    };
  }

  return id;
};
