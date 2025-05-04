import type { FlattenedField, Payload, Sort } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

import { getCollection } from '../utilities/getCollection.js';
import { getLocalizedSortProperty } from './getLocalizedSortProperty.js';

type BuildSortParamArgs = {
  adapter: DynamoDBAdapter;
  config: Payload;
  fields: FlattenedField[];
  locale?: string;
  parentIsLocalized?: boolean;
  sort?: Sort;
  timestamps?: boolean;
  versions?: boolean;
};

export type SortDirection = 'asc' | 'desc';

type SortResult = {
  IndexName?: string;
  ScanIndexForward: boolean;
};

const relationshipSort = ({
  adapter,
  fields,
  locale,
  path,
  sortDirection,
}: {
  adapter: DynamoDBAdapter;
  fields: FlattenedField[];
  locale?: string;
  path: string;
  sortDirection: SortDirection;
}): false | SortResult => {
  let currentFields = fields;
  const segments = path.split('.');
  if (segments.length < 2) {
    return false;
  }

  for (const [i, segment] of segments.entries()) {
    const field = currentFields.find((each) => each.name === segment);

    if (!field) {
      return false;
    }

    if ('fields' in field) {
      currentFields = field.flattenedFields;
    } else if (
      (field.type === 'relationship' || field.type === 'upload') &&
      i !== segments.length - 1
    ) {
      const relationshipPath = segments.slice(0, i + 1).join('.');
      let sortFieldPath = segments.slice(i + 1, segments.length).join('.');

      if (Array.isArray(field.relationTo)) {
        throw new Error('Sorting by multiple relations is not supported');
      }

      const { collectionConfig } = getCollection({ adapter, collectionSlug: field.relationTo });

      const foreignFieldPath = collectionConfig.fields.find((f) => f.name === sortFieldPath);

      if (!foreignFieldPath) {
        return false;
      }

      if (foreignFieldPath.localized && locale) {
        sortFieldPath = `${sortFieldPath}.${locale}`;
      }

      // For relationship fields, we need to use a secondary index
      return {
        IndexName: `${relationshipPath}_${sortFieldPath}_index`,
        ScanIndexForward: sortDirection === 'asc',
      };
    }
  }

  return false;
};

export const buildSortParam = ({
  adapter,
  config,
  fields,
  locale,
  parentIsLocalized = false,
  sort,
  timestamps = true,
  versions,
}: BuildSortParamArgs): SortResult => {
  const sortParams: SortResult = {
    ScanIndexForward: true,
  };

  if (!sort) {
    if (timestamps) {
      sort = '-createdAt';
    } else {
      sort = '-id';
    }
  }

  if (typeof sort === 'string') {
    sort = [sort];
  }

  const sorting = sort.reduce<Record<string, SortDirection>>((acc, item) => {
    let sortProperty: string;
    let sortDirection: SortDirection;
    if (item.indexOf('-') === 0) {
      sortProperty = item.substring(1);
      sortDirection = 'desc';
    } else {
      sortProperty = item;
      sortDirection = 'asc';
    }

    if (sortProperty === 'id') {
      acc['id'] = sortDirection;
      return acc;
    }

    const relationshipSortResult = relationshipSort({
      adapter,
      fields,
      locale,
      path: sortProperty,
      sortDirection,
    });

    if (relationshipSortResult) {
      return { ...acc, ...relationshipSortResult };
    }

    const localizedProperty = getLocalizedSortProperty({
      config,
      fields,
      locale,
      parentIsLocalized,
      segments: sortProperty.split('.'),
    });

    acc[localizedProperty] = sortDirection;
    return acc;
  }, {});

  // For non-relationship fields, we can use the primary index
  if (Object.keys(sorting).length > 0) {
    const entries = Object.entries(sorting);
    if (entries.length > 0) {
      const [firstField, firstDirection] = entries[0];
      sortParams.ScanIndexForward = firstDirection === 'asc';
    }
  }

  return sortParams;
};
