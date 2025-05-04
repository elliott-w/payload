import type { FlattenedField, Where, WhereField } from 'payload';

import { KEY_NAMES } from './constants.js';

interface QueryBuilderOptions {
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  filterExpression?: string;
  indexName?: string;
  limit?: number;
  sort?: string | string[];
  startKey?: Record<string, any>;
}

interface BuildQueryArgs {
  collectionSlug?: string;
  fields: FlattenedField[];
  globalSlug?: string;
  locale?: string;
  where: Where;
}

interface QueryResult {
  $and?: Array<Record<string, any>>;
  $or?: Array<Record<string, any>>;
  [key: string]: any;
}

export const buildQuery = async ({
  collectionSlug,
  fields,
  globalSlug,
  locale,
  where,
}: BuildQueryArgs): Promise<QueryResult> => {
  const result = await parseParams({
    collectionSlug,
    fields,
    globalSlug,
    locale,
    parentIsLocalized: false,
    where,
  });

  return result;
};

export const parseParams = async ({
  collectionSlug,
  fields,
  globalSlug,
  locale,
  parentIsLocalized,
  where,
}: {
  collectionSlug?: string;
  fields: FlattenedField[];
  globalSlug?: string;
  locale?: string;
  parentIsLocalized: boolean;
  where: Where;
}): Promise<QueryResult> => {
  const result: QueryResult = {};

  if (typeof where === 'object') {
    for (const relationOrPath of Object.keys(where)) {
      const condition = where[relationOrPath];
      let conditionOperator: '$and' | '$or' | null = null;

      if (relationOrPath.toLowerCase() === 'and') {
        conditionOperator = '$and';
      } else if (relationOrPath.toLowerCase() === 'or') {
        conditionOperator = '$or';
      }

      if (Array.isArray(condition)) {
        const builtConditions = await buildAndOrConditions({
          collectionSlug,
          fields,
          globalSlug,
          locale,
          parentIsLocalized,
          where: condition,
        });

        if (builtConditions.length > 0 && conditionOperator !== null) {
          result[conditionOperator] = builtConditions;
        }
      } else {
        const pathOperators = where[relationOrPath] as Record<string, unknown>;
        if (typeof pathOperators === 'object') {
          for (const operator of Object.keys(pathOperators)) {
            const searchParam = await buildSearchParam({
              collectionSlug,
              fields,
              globalSlug,
              incomingPath: relationOrPath,
              locale,
              operator,
              parentIsLocalized,
              val: pathOperators[operator],
            });

            if (searchParam?.value && searchParam?.path) {
              if (Object.keys(pathOperators).length > 1) {
                if (!result.$and) {
                  result.$and = [];
                }
                result.$and.push({
                  [searchParam.path]: searchParam.value,
                });
              } else {
                if (result[searchParam.path]) {
                  if (!result.$and) {
                    result.$and = [];
                  }
                  result.$and.push({ [searchParam.path]: result[searchParam.path] });
                  result.$and.push({
                    [searchParam.path]: searchParam.value,
                  });
                  delete result[searchParam.path];
                } else {
                  result[searchParam.path] = searchParam.value;
                }
              }
            }
          }
        }
      }
    }
  }

  return result;
};

export const buildAndOrConditions = async ({
  collectionSlug,
  fields,
  globalSlug,
  locale,
  parentIsLocalized,
  where,
}: {
  collectionSlug?: string;
  fields: FlattenedField[];
  globalSlug?: string;
  locale?: string;
  parentIsLocalized: boolean;
  where: Where[];
}): Promise<Array<Record<string, any>>> => {
  const completedConditions: Array<Record<string, any>> = [];

  for (const condition of where) {
    if (typeof condition === 'object') {
      const result = await parseParams({
        collectionSlug,
        fields,
        globalSlug,
        locale,
        parentIsLocalized,
        where: condition,
      });

      if (Object.keys(result).length > 0) {
        completedConditions.push(result);
      }
    }
  }

  return completedConditions;
};

export const buildSearchParam = async ({
  collectionSlug,
  fields,
  globalSlug,
  incomingPath,
  locale,
  operator,
  parentIsLocalized,
  val,
}: {
  collectionSlug?: string;
  fields: FlattenedField[];
  globalSlug?: string;
  incomingPath: string;
  locale?: string;
  operator: string;
  parentIsLocalized: boolean;
  val: unknown;
}): Promise<{ path: string; value: Record<string, any> } | undefined> => {
  let sanitizedPath = incomingPath.replace(/__/g, '.');
  if (sanitizedPath === 'id') {
    sanitizedPath = '_id';
  }

  const field = fields.find((f) => f.name === sanitizedPath);
  if (!field) {
    return undefined;
  }

  let formattedValue = val;
  const formattedOperator = operator;

  // Handle different field types
  switch (field.type) {
    case 'checkbox':
      if (typeof val === 'string') {
        formattedValue = val.toLowerCase() === 'true';
      }
      break;
    case 'date':
      if (typeof val === 'string' && operator !== 'exists') {
        formattedValue = new Date(val);
      }
      break;
    case 'number':
      if (typeof val === 'string' && operator !== 'exists') {
        formattedValue = Number(val);
      }
      break;
    case 'relationship':
    case 'upload':
      if (val === 'null') {
        formattedValue = null;
      }
      break;
  }

  // Handle different operators
  switch (operator) {
    case 'equals':
      return {
        path: sanitizedPath,
        value: { $eq: formattedValue },
      };
    case 'exists':
      return {
        path: sanitizedPath,
        value: { $exists: formattedValue === true || formattedValue === 'true' },
      };
    case 'greater_than':
      return {
        path: sanitizedPath,
        value: { $gt: formattedValue },
      };
    case 'greater_than_equal':
      return {
        path: sanitizedPath,
        value: { $gte: formattedValue },
      };
    case 'in':
      return {
        path: sanitizedPath,
        value: { $in: Array.isArray(formattedValue) ? formattedValue : [formattedValue] },
      };
    case 'less_than':
      return {
        path: sanitizedPath,
        value: { $lt: formattedValue },
      };
    case 'less_than_equal':
      return {
        path: sanitizedPath,
        value: { $lte: formattedValue },
      };
    case 'like':
      return {
        path: sanitizedPath,
        value: {
          $options: 'i',
          $regex: String(formattedValue).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
        },
      };
    case 'not_equals':
      return {
        path: sanitizedPath,
        value: { $ne: formattedValue },
      };
    case 'not_in':
      return {
        path: sanitizedPath,
        value: { $nin: Array.isArray(formattedValue) ? formattedValue : [formattedValue] },
      };
    case 'not_like':
      return {
        path: sanitizedPath,
        value: {
          $not: {
            $options: 'i',
            $regex: String(formattedValue).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
          },
        },
      };
    default:
      return undefined;
  }
};
