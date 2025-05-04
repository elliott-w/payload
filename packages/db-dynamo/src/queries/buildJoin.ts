import type { FlattenedField, Payload } from 'payload';

import { fieldAffectsData } from 'payload/shared';

import type { DynamoDBAdapter } from '../index.js';

import { getCollection } from '../utilities/getCollection.js';

type BuildJoinArgs = {
  adapter: DynamoDBAdapter;
  config: Payload;
  fields: FlattenedField[];
  locale?: string;
  path: string;
};

export const buildJoin = async ({
  adapter,
  config,
  fields,
  locale,
  path,
}: BuildJoinArgs): Promise<{
  BatchGetItemInput: {
    RequestItems: Record<string, { Keys: Record<string, any>[] }>;
  };
  joinField: FlattenedField;
}> => {
  const segments = path.split('.');
  let currentFields = fields;
  let joinField: FlattenedField | undefined;

  // Find the relationship field
  for (const [i, segment] of segments.entries()) {
    const field = currentFields.find((f) => f.name === segment);

    if (!field) {
      throw new Error(`Field ${segment} not found in path ${path}`);
    }

    if (i === segments.length - 1) {
      joinField = field;
      break;
    }

    if ('fields' in field) {
      currentFields = field.fields as FlattenedField[];
    } else if (field.type === 'relationship' || field.type === 'upload') {
      const relationTo = Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo;
      if (!relationTo) {
        throw new Error(`No relationTo found for field ${field.name}`);
      }
      const { collectionConfig } = getCollection({ adapter, collectionSlug: relationTo });
      currentFields = collectionConfig.fields as FlattenedField[];
    }
  }

  if (!joinField) {
    throw new Error(`Join field not found in path ${path}`);
  }

  if (joinField.type !== 'relationship' && joinField.type !== 'upload') {
    throw new Error(`Field ${joinField.name} is not a relationship or upload field`);
  }

  const relationTo = Array.isArray(joinField.relationTo)
    ? joinField.relationTo[0]
    : joinField.relationTo;
  if (!relationTo) {
    throw new Error(`No relationTo found for field ${joinField.name}`);
  }

  // Build the batch get request
  const batchGetItemInput = {
    RequestItems: {
      [relationTo]: {
        Keys: [],
      },
    },
  };

  return {
    BatchGetItemInput: batchGetItemInput,
    joinField,
  };
};

export const processJoinResults = ({
  items,
  joinField,
  locale,
}: {
  items: Record<string, any>[];
  joinField: FlattenedField;
  locale?: string;
}): Record<string, any>[] => {
  return items.map((item) => {
    if (joinField.localized && locale) {
      return {
        ...item,
        [locale]: item[locale] || {},
      };
    }
    return item;
  });
};
