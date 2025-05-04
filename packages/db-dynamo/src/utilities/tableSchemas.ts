import { ATTRIBUTE_TYPES, INDEX_NAMES, KEY_NAMES } from './constants';

export const getBaseTableSchema = () => ({
  AttributeDefinitions: [
    { AttributeName: KEY_NAMES.PARTITION_KEY, AttributeType: ATTRIBUTE_TYPES.STRING },
    { AttributeName: KEY_NAMES.SORT_KEY, AttributeType: ATTRIBUTE_TYPES.STRING },
    { AttributeName: KEY_NAMES.GSI1_PARTITION_KEY, AttributeType: ATTRIBUTE_TYPES.STRING },
    { AttributeName: KEY_NAMES.GSI1_SORT_KEY, AttributeType: ATTRIBUTE_TYPES.STRING },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: INDEX_NAMES.GSI1,
      KeySchema: [
        { AttributeName: KEY_NAMES.GSI1_PARTITION_KEY, KeyType: 'HASH' },
        { AttributeName: KEY_NAMES.GSI1_SORT_KEY, KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    },
  ],
  KeySchema: [
    { AttributeName: KEY_NAMES.PARTITION_KEY, KeyType: 'HASH' },
    { AttributeName: KEY_NAMES.SORT_KEY, KeyType: 'RANGE' },
  ],
});

export const getVersionTableSchema = () => {
  const baseSchema = getBaseTableSchema();
  return {
    ...baseSchema,
    AttributeDefinitions: [
      ...baseSchema.AttributeDefinitions,
      { AttributeName: KEY_NAMES.GSI2_PARTITION_KEY, AttributeType: ATTRIBUTE_TYPES.STRING },
      { AttributeName: KEY_NAMES.GSI2_SORT_KEY, AttributeType: ATTRIBUTE_TYPES.STRING },
    ],
    GlobalSecondaryIndexes: [
      ...baseSchema.GlobalSecondaryIndexes,
      {
        IndexName: INDEX_NAMES.GSI2,
        KeySchema: [
          { AttributeName: KEY_NAMES.GSI2_PARTITION_KEY, KeyType: 'HASH' },
          { AttributeName: KEY_NAMES.GSI2_SORT_KEY, KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  };
};
