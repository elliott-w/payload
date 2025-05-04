import type { Payload } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

type GetCollectionArgs = {
  adapter: DynamoDBAdapter;
  collectionSlug: string;
};

export const getCollection = ({ adapter, collectionSlug }: GetCollectionArgs) => {
  const collectionConfig = adapter.payload.config.collections.find(
    (collection) => collection.slug === collectionSlug
  );

  if (!collectionConfig) {
    throw new Error(`Collection ${collectionSlug} not found`);
  }

  const tableInfo = {
    name: collectionSlug,
  };

  return {
    collectionConfig,
    tableInfo,
  };
};
