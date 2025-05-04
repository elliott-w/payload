import type { PayloadRequest } from 'payload';

import type { DynamoDBAdapter, DynamoDBSession } from '../index.js';

/**
 * Returns the session belonging to the transaction of the req.session if exists
 * @returns DynamoDBSession | undefined
 */
export async function getSession(
  db: DynamoDBAdapter,
  req?: Partial<PayloadRequest>
): Promise<DynamoDBSession | undefined> {
  if (!req) {
    return;
  }

  let transactionID = req.transactionID;

  if (transactionID instanceof Promise) {
    transactionID = await req.transactionID;
  }

  if (transactionID) {
    return db.sessions[transactionID];
  }
}
