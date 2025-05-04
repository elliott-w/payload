export const TABLE_NAMES = {
  COLLECTIONS: 'collections',
  GLOBALS: 'globals',
  MIGRATIONS: 'migrations',
  VERSIONS: 'versions',
} as const;

export const KEY_NAMES = {
  GSI1_PARTITION_KEY: 'gsi1pk',
  GSI1_SORT_KEY: 'gsi1sk',
  GSI2_PARTITION_KEY: 'gsi2pk',
  GSI2_SORT_KEY: 'gsi2sk',
  PARTITION_KEY: 'pk',
  SORT_KEY: 'sk',
} as const;

export const INDEX_NAMES = {
  GSI1: 'gsi1',
  GSI2: 'gsi2',
} as const;

export const ATTRIBUTE_TYPES = {
  BINARY: 'B',
  BINARY_SET: 'BS',
  BOOLEAN: 'BOOL',
  LIST: 'L',
  MAP: 'M',
  NULL: 'NULL',
  NUMBER: 'N',
  NUMBER_SET: 'NS',
  STRING: 'S',
  STRING_SET: 'SS',
} as const;
