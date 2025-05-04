import type { Payload } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

type BuildSortParamArgs = {
  adapter: DynamoDBAdapter;
  config: Payload;
  fields: any[];
  locale?: string;
  sort?: { [key: string]: 'asc' | 'desc' } | string;
};

export const buildSortParam = ({ adapter, config, fields, locale, sort }: BuildSortParamArgs) => {
  const sortParams: any = {};

  if (sort) {
    let sortFields: { direction: 'asc' | 'desc'; field: string }[] = [];

    if (typeof sort === 'string') {
      // Handle string sort format (e.g., 'field asc' or 'field desc')
      const parts = sort.split(' ');
      if (parts.length === 2 && parts[0] && parts[1]) {
        sortFields.push({
          direction: parts[1] as 'asc' | 'desc',
          field: parts[0],
        });
      }
    } else if (typeof sort === 'object') {
      // Handle object sort format (e.g., { field: 'asc' })
      sortFields = Object.entries(sort)
        .filter(([field, direction]) => field && direction)
        .map(([field, direction]) => ({
          direction: direction as 'asc' | 'desc',
          field,
        }));
    }

    if (sortFields.length > 0) {
      // For Scan operations, we can only sort by one field at a time
      // We'll use the first sort field as the primary sort key
      const primarySort = sortFields[0];
      if (primarySort) {
        // Set the scan direction based on the sort order
        sortParams.ScanIndexForward = primarySort.direction === 'asc';
      }
    }
  }

  return sortParams;
};
