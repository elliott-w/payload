import type { FlattenedField, Payload } from 'payload';

import { fieldAffectsData } from 'payload/shared';

import type { DynamoDBAdapter } from '../index.js';

import { getCollection } from '../utilities/getCollection.js';

type Select = Record<string, boolean> | string[];

type BuildProjectionArgs = {
  adapter: DynamoDBAdapter;
  config: Payload;
  fields: FlattenedField[];
  locale?: string;
  select?: Select;
};

export const buildProjection = ({
  adapter,
  config,
  fields,
  locale,
  select,
}: BuildProjectionArgs): {
  ExpressionAttributeNames: Record<string, string>;
  ProjectionExpression: string;
} => {
  const expressionAttributeNames: Record<string, string> = {};
  const projectionExpressions: string[] = [];

  if (!select) {
    return {
      ExpressionAttributeNames: {},
      ProjectionExpression: '',
    };
  }

  const processField = (field: FlattenedField, path: string[] = []) => {
    const currentPath = [...path, field.name];
    const fieldPath = currentPath.join('.');

    if (fieldAffectsData(field)) {
      if (field.localized && locale) {
        const localizedPath = [...currentPath, locale];
        const localizedFieldPath = localizedPath.join('.');
        expressionAttributeNames[`#${localizedFieldPath}`] = localizedFieldPath;
        projectionExpressions.push(`#${localizedFieldPath}`);
      } else {
        expressionAttributeNames[`#${fieldPath}`] = fieldPath;
        projectionExpressions.push(`#${fieldPath}`);
      }
    }

    if ('fields' in field) {
      field.fields.forEach((subField) => {
        processField(subField as FlattenedField, currentPath);
      });
    }
  };

  if (typeof select === 'object' && !Array.isArray(select)) {
    // Handle include/exclude mode
    const mode = Object.keys(select).some((key) => select[key] === false) ? 'exclude' : 'include';

    fields.forEach((field) => {
      if (mode === 'include') {
        if (select[field.name] === true) {
          processField(field);
        }
      } else {
        if (select[field.name] !== false) {
          processField(field);
        }
      }
    });
  } else if (Array.isArray(select)) {
    // Handle array of field names
    select.forEach((fieldName) => {
      const field = fields.find((f) => f.name === fieldName);
      if (field) {
        processField(field);
      }
    });
  }

  return {
    ExpressionAttributeNames: expressionAttributeNames,
    ProjectionExpression: projectionExpressions.join(', '),
  };
};
