import type { FindOne, FindOneArgs, JoinQuery, SelectType, TypeWithID } from 'payload';

import { QueryCommand } from '@aws-sdk/client-dynamodb';

import type { DynamoDBAdapter } from '../index.js';

import { buildComplexQuery } from '../queries/buildComplexQuery.js';
import { getCollection } from '../utilities/getCollection.js';
import { transform } from '../utilities/transform.js';

export const findOne: FindOne = async function findOne<T = TypeWithID>(
  this: DynamoDBAdapter,
  args: FindOneArgs
): Promise<null | T> {
  const {
    collection: collectionSlug,
    draftsEnabled,
    joins = {},
    locale,
    select,
    where = {},
  } = args;

  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { collectionConfig, tableInfo } = getCollection({ adapter: this, collectionSlug });

  // Build the query expression from the where clause using complex query builder
  const queryExpression = await buildComplexQuery({
    adapter: this,
    collectionSlug,
    fields: collectionConfig.fields,
    locale,
    where,
  });

  // Handle field selection
  const projectionExpression = select
    ? buildProjectionExpression(select as unknown as string[])
    : undefined;

  const params = {
    TableName: tableInfo.name,
    ...queryExpression,
    Limit: 1,
    ProjectionExpression: projectionExpression,
    ...(draftsEnabled
      ? { FilterExpression: 'attribute_not_exists(_status) OR _status = :published' }
      : {}),
  };

  if (draftsEnabled) {
    params.ExpressionAttributeValues = {
      ...params.ExpressionAttributeValues,
      ':published': { S: 'published' },
    };
  }

  const result = await this.client.send(new QueryCommand(params));

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  let doc = transform({
    adapter: this,
    data: result.Items[0] as Record<string, unknown>,
    fields: collectionConfig.fields,
    operation: 'read',
  }) as unknown as T;

  // Handle joins if specified
  if (Object.keys(joins).length > 0) {
    doc = await processJoins(this, doc, joins as Record<string, any>, collectionConfig);
  }

  return doc;
};

// Helper function to build projection expression from select
function buildProjectionExpression(select: string[]): string {
  return select.map((field) => `#${field}`).join(', ');
}

// Helper function to process joins
async function processJoins(
  adapter: DynamoDBAdapter,
  doc: any,
  joins: Record<string, any>,
  collectionConfig: any
): Promise<any> {
  const joinPromises = Object.entries(joins).map(async ([relation, joinConfig]) => {
    const relationField = collectionConfig.fields.find((f: any) => f.name === relation);
    if (!relationField) {
      return;
    }

    const relatedCollection = relationField.relationTo;
    if (!relatedCollection) {
      return;
    }

    const relatedId = doc[relation];
    if (!relatedId) {
      return;
    }

    const { collectionConfig: relatedConfig, tableInfo } = getCollection({
      adapter,
      collectionSlug: relatedCollection,
    });

    if (!adapter.client) {
      throw new Error('DynamoDB client not initialized');
    }

    const command = new QueryCommand({
      ExpressionAttributeValues: {
        ':id': { S: relatedId },
      },
      KeyConditionExpression: 'id = :id',
      TableName: tableInfo.name,
    });

    const result = await adapter.client.send(command);
    const relatedDoc = result.Items?.[0];

    if (relatedDoc) {
      doc[relation] = transform({
        adapter,
        data: relatedDoc as Record<string, unknown>,
        fields: relatedConfig.fields,
        operation: 'read',
      });
    }
  });

  await Promise.all(joinPromises);
  return doc;
}
