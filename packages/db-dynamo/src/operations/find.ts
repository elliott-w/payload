import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import type {
  Find,
  FindArgs,
  JoinQuery,
  PaginatedDocs,
  RelationshipField,
  SelectType,
  TypeWithID,
} from 'payload';

import { BatchGetItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { flattenAllFields } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

import { buildComplexQuery } from '../queries/buildComplexQuery.js';
import { buildJoin, processJoinResults } from '../queries/buildJoin.js';
import { buildPagination, getPaginationInfo } from '../queries/buildPagination.js';
import { buildProjection } from '../queries/buildProjection.js';
import { buildSortParam } from '../queries/buildSortParam.js';
import { getCollection } from '../utilities/getCollection.js';
import { transform } from '../utilities/transform.js';

type Select = Record<string, boolean> | string[];

interface JoinData {
  items: Record<string, AttributeValue>[];
  joinField: RelationshipField;
  locale?: string;
}

export const find: Find = async function find<T = TypeWithID>(
  this: DynamoDBAdapter,
  args: FindArgs
): Promise<PaginatedDocs<T>> {
  const {
    collection: collectionSlug,
    draftsEnabled,
    joins = {},
    limit = 10,
    locale,
    page = 1,
    select,
    sort,
    where = {},
  } = args;

  if (!this.client) {
    throw new Error('DynamoDB client not initialized');
  }

  const { collectionConfig, tableInfo } = getCollection({ adapter: this, collectionSlug });
  const flattenedFields = flattenAllFields({ cache: true, fields: collectionConfig.fields });

  // Build sort parameters
  const sortParams = buildSortParam({
    adapter: this,
    config: this.payload,
    fields: flattenedFields,
    locale,
    sort,
  });

  // Build the query expression
  const queryParams = await buildComplexQuery({
    adapter: this,
    collectionSlug,
    fields: flattenedFields,
    locale,
    where,
  });

  // Build projection expression
  const { ExpressionAttributeNames: projectionNames, ProjectionExpression } = buildProjection({
    adapter: this,
    config: this.payload,
    fields: flattenedFields,
    locale,
    select: select as Select,
  });

  // Build pagination parameters
  const paginationParams = buildPagination({
    adapter: this,
    config: this.payload,
    limit,
    page,
  });

  // Combine all parameters
  const params = {
    TableName: tableInfo.name,
    ...sortParams,
    ...queryParams,
    ...paginationParams,
    ExpressionAttributeNames: {
      ...queryParams.ExpressionAttributeNames,
      ...projectionNames,
    },
    ProjectionExpression,
  };

  // Add draft status filter if enabled
  if (draftsEnabled) {
    params.FilterExpression = params.FilterExpression
      ? `${params.FilterExpression} AND attribute_not_exists(_status)`
      : 'attribute_not_exists(_status)';
  }

  // Execute query
  let result;
  if (sortParams.IndexName) {
    result = await this.client.send(new QueryCommand(params));
  } else {
    result = await this.client.send(new ScanCommand(params));
  }

  if (!result.Items) {
    return {
      docs: [],
      hasNextPage: false,
      hasPrevPage: false,
      limit,
      nextPage: null,
      page,
      pagingCounter: 1,
      prevPage: null,
      totalDocs: 0,
      totalPages: 0,
    };
  }

  // Transform and process results
  let docs = result.Items.map((item) =>
    transform({
      adapter: this,
      data: item,
      fields: collectionConfig.fields,
      operation: 'read',
    })
  ) as T[];

  // Process joins if specified
  if (Object.keys(joins).length > 0) {
    for (const [path, joinConfig] of Object.entries(joins)) {
      const { BatchGetItemInput, joinField } = await buildJoin({
        adapter: this,
        config: this.payload,
        fields: flattenedFields,
        locale,
        path,
      });

      // Get related IDs from the current documents
      const relatedIds = docs
        .map((doc): string | string[] | undefined => {
          const segments = path.split('.');
          let value = doc as Record<string, any>;
          for (const segment of segments) {
            if (value && typeof value === 'object' && segment in value) {
              value = value[segment];
            } else {
              return undefined;
            }
          }
          return value as string | string[];
        })
        .filter((value): value is string | string[] => {
          if (!value) {
            return false;
          }
          if (typeof value === 'string') {
            return true;
          }
          if (Array.isArray(value)) {
            return value.every((item) => typeof item === 'string');
          }
          return false;
        })
        .reduce<string[]>((acc, value) => {
          if (typeof value === 'string') {
            acc.push(value);
          } else if (Array.isArray(value)) {
            acc.push(...value);
          }
          return acc;
        }, []);

      if (relatedIds.length > 0 && joinField.type === 'relationship' && joinField.relationTo) {
        const relationTo =
          typeof joinField.relationTo === 'string' ? joinField.relationTo : joinField.relationTo[0];

        if (!BatchGetItemInput.RequestItems) {
          BatchGetItemInput.RequestItems = {};
        }

        if (relationTo) {
          BatchGetItemInput.RequestItems[relationTo] = {
            Keys: relatedIds.map((id) => ({
              id: { S: id },
            })),
          };
        }

        const joinResult = await this.client.send(new BatchGetItemCommand(BatchGetItemInput));
        if (!joinResult.Responses) {
          continue;
        }

        const relatedDocs = relationTo ? joinResult.Responses[relationTo] || [] : [];

        // Process join results
        const processedDocs = processJoinResults({
          items: relatedDocs,
          joinField,
          locale,
        });

        // Map related docs to their IDs
        const relatedDocsMap = processedDocs.reduce<Record<string, any>>((acc, doc) => {
          if (doc?.id) {
            acc[doc.id] = doc;
          }
          return acc;
        }, {});

        // Update original docs with related data
        docs = docs.map((doc) => {
          const segments = path.split('.');
          let current = doc as Record<string, any>;
          let parent = current;

          for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            if (current && typeof current === 'object' && segment && segment in current) {
              parent = current;
              current = current[segment];
            } else {
              return doc;
            }
          }

          const lastSegment = segments[segments.length - 1];
          if (lastSegment && current && typeof current === 'object' && lastSegment in current) {
            const value = current[lastSegment];
            if (Array.isArray(value)) {
              parent[lastSegment] = value.map((id: string) => relatedDocsMap[id] || id);
            } else if (value) {
              parent[lastSegment] = relatedDocsMap[value] || value;
            }
          }
          return doc;
        });
      }
    }
  }

  // Get pagination info
  const paginationInfo = getPaginationInfo({
    items: docs,
    lastEvaluatedKey: result.LastEvaluatedKey,
    limit,
    page,
  });

  return {
    ...paginationInfo,
    pagingCounter: (page - 1) * limit + 1,
  };
};
