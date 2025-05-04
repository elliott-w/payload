import type { GlobalConfig } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

type GetGlobalArgs = {
  adapter: DynamoDBAdapter;
  globalSlug: string;
};

type GetGlobalResult = {
  globalConfig: GlobalConfig;
  tableInfo: {
    name: string;
  };
};

export const getGlobal = ({ adapter, globalSlug }: GetGlobalArgs): GetGlobalResult => {
  const globalConfig = adapter.payload.globals.config.find(
    (g: GlobalConfig) => g.slug === globalSlug
  );

  if (!globalConfig) {
    throw new Error(`Global with slug ${globalSlug} not found`);
  }

  if (!adapter.collections.globals) {
    throw new Error('Globals collection not initialized');
  }

  return {
    globalConfig,
    tableInfo: {
      name: adapter.collections.globals.name,
    },
  };
};
