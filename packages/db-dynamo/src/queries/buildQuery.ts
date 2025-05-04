import type { Payload, Where } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

type BuildQueryArgs = {
  adapter: DynamoDBAdapter;
  collectionSlug: string;
  fields: any[];
  locale?: string;
  where?: Where;
};

export const buildQuery = async ({
  adapter,
  collectionSlug,
  fields,
  locale,
  where = {},
}: BuildQueryArgs) => {
  const queryParams: any = {
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    TableName: collectionSlug,
  };

  // Handle basic where conditions
  if (where && Object.keys(where).length > 0) {
    const conditions: string[] = [];
    let valueIndex = 1;

    // Handle AND/OR conditions
    if (where.and || where.or) {
      const operator = where.and ? 'AND' : 'OR';
      const conditionsArray = where.and || where.or || [];

      const subConditions = await Promise.all(
        conditionsArray.map(async (condition) => {
          const subQuery = await buildQuery({
            adapter,
            collectionSlug,
            fields,
            locale,
            where: condition,
          });
          return subQuery.FilterExpression;
        })
      );

      if (subConditions.length > 0) {
        queryParams.FilterExpression = `(${subConditions.join(` ${operator} `)})`;
      }
    } else {
      // Handle individual field conditions
      Object.entries(where).forEach(([field, condition]) => {
        if (typeof condition === 'object') {
          Object.entries(condition).forEach(([operator, value]) => {
            const fieldName = `#${field}`;
            const valueName = `:v${valueIndex}`;

            queryParams.ExpressionAttributeNames[fieldName] = field;
            queryParams.ExpressionAttributeValues[valueName] = value;

            switch (operator) {
              case 'begins_with':
                conditions.push(`begins_with(${fieldName}, ${valueName})`);
                break;
              case 'between':
                if (Array.isArray(value) && value.length === 2) {
                  const valueName2 = `:v${valueIndex + 1}`;
                  conditions.push(`${fieldName} BETWEEN ${valueName} AND ${valueName2}`);
                  queryParams.ExpressionAttributeValues[valueName2] = value[1];
                  valueIndex++;
                }
                break;
              case 'contains':
                conditions.push(`contains(${fieldName}, ${valueName})`);
                break;
              case 'equals':
                conditions.push(`${fieldName} = ${valueName}`);
                break;
              case 'exists':
                conditions.push(`attribute_exists(${fieldName})`);
                break;
              case 'greater_than':
                conditions.push(`${fieldName} > ${valueName}`);
                break;
              case 'greater_than_equal':
                conditions.push(`${fieldName} >= ${valueName}`);
                break;
              case 'in':
                if (Array.isArray(value)) {
                  const inValues = value.map((v, i) => `:v${valueIndex + i}`);
                  conditions.push(`${fieldName} IN (${inValues.join(', ')})`);
                  value.forEach((v, i) => {
                    queryParams.ExpressionAttributeValues[`:v${valueIndex + i}`] = v;
                  });
                  valueIndex += value.length;
                }
                break;
              case 'less_than':
                conditions.push(`${fieldName} < ${valueName}`);
                break;
              case 'less_than_equal':
                conditions.push(`${fieldName} <= ${valueName}`);
                break;
              case 'not_equals':
                conditions.push(`${fieldName} <> ${valueName}`);
                break;
              case 'not_exists':
                conditions.push(`attribute_not_exists(${fieldName})`);
                break;
              case 'not_in':
                if (Array.isArray(value)) {
                  const notInValues = value.map((v, i) => `:v${valueIndex + i}`);
                  conditions.push(`${fieldName} NOT IN (${notInValues.join(', ')})`);
                  value.forEach((v, i) => {
                    queryParams.ExpressionAttributeValues[`:v${valueIndex + i}`] = v;
                  });
                  valueIndex += value.length;
                }
                break;
            }
            valueIndex++;
          });
        }
      });

      if (conditions.length > 0) {
        queryParams.FilterExpression = conditions.join(' AND ');
      }
    }
  }

  return queryParams;
};
