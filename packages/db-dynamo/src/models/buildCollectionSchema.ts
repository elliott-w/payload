import type { Payload, SanitizedCollectionConfig } from 'payload';

interface BuildCollectionSchemaArgs {
  collection: SanitizedCollectionConfig;
  payload: Payload;
  schemaOptions?: Record<string, unknown>;
}

export function buildCollectionSchema({
  collection,
  payload,
  schemaOptions,
}: BuildCollectionSchemaArgs): Record<string, unknown> {
  // For DynamoDB, we'll create a schema that maps to DynamoDB's data model
  // This includes defining the primary key structure and any secondary indexes
  const schema: Record<string, unknown> = {
    // Define the primary key structure
    // In DynamoDB, we need a partition key and optionally a sort key
    keySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH', // Partition key
      },
    ],
    // Define the attribute definitions
    attributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S', // String type
      },
    ],
    // Define any secondary indexes
    globalSecondaryIndexes: [],
    // Define the collection's fields
    fields: collection.fields,
  };

  // Add any schema options
  if (schemaOptions) {
    Object.assign(schema, schemaOptions);
  }

  return schema;
}
