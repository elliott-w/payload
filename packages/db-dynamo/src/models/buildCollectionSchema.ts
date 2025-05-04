import type { SanitizedCollectionConfig, SanitizedGlobalConfig } from 'payload';

interface BuildCollectionSchemaArgs {
  config: SanitizedCollectionConfig | SanitizedGlobalConfig;
  isVersion?: boolean;
}

export function buildCollectionSchema({ config, isVersion = false }: BuildCollectionSchemaArgs) {
  // For now, return a basic schema structure
  // This will be expanded to handle all field types and relationships
  return {
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' as const },
      { AttributeName: 'createdAt', AttributeType: 'S' as const },
      ...(isVersion ? [{ AttributeName: 'parent', AttributeType: 'S' as const }] : []),
    ],
    BillingMode: 'PAY_PER_REQUEST' as const,
    GlobalSecondaryIndexes: [
      ...(isVersion
        ? [
            {
              IndexName: 'parent-index',
              KeySchema: [
                { AttributeName: 'parent', KeyType: 'HASH' as const },
                { AttributeName: 'createdAt', KeyType: 'RANGE' as const },
              ],
              Projection: {
                ProjectionType: 'ALL' as const,
              },
            },
          ]
        : []),
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' as const },
      { AttributeName: 'createdAt', KeyType: 'RANGE' as const },
    ],
  };
}
