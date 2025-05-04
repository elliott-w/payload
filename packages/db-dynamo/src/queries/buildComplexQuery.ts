import type { Where } from 'payload';

import type { DynamoDBAdapter } from '../index.js';

type BuildComplexQueryArgs = {
  adapter: DynamoDBAdapter;
  collectionSlug: string;
  fields: any[];
  locale?: string;
  where?: Where;
};

export const buildComplexQuery = async ({
  adapter,
  collectionSlug,
  fields,
  locale,
  where = {},
}: BuildComplexQueryArgs) => {
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
          const subQuery = await buildComplexQuery({
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
          // Handle nested fields
          if (field.includes('.')) {
            const [parentField, childField] = field.split('.');
            const fieldName = `#${parentField}.#${childField}`;
            queryParams.ExpressionAttributeNames[`#${parentField}`] = parentField;
            queryParams.ExpressionAttributeNames[`#${childField}`] = childField;

            Object.entries(condition).forEach(([operator, value]) => {
              const valueName = `:v${valueIndex}`;
              queryParams.ExpressionAttributeValues[valueName] = value;

              switch (operator) {
                case 'all':
                  if (Array.isArray(value)) {
                    const allConditions = value.map((v, i) => {
                      const vName = `:v${valueIndex + i}`;
                      queryParams.ExpressionAttributeValues[vName] = v;
                      return `contains(${fieldName}, ${vName})`;
                    });
                    conditions.push(`(${allConditions.join(' AND ')})`);
                    valueIndex += value.length;
                  }
                  break;
                case 'contains':
                  if (Array.isArray(value)) {
                    // Handle array containment
                    const containsConditions = value.map((v, i) => {
                      const vName = `:v${valueIndex + i}`;
                      queryParams.ExpressionAttributeValues[vName] = v;
                      return `contains(${fieldName}, ${vName})`;
                    });
                    conditions.push(`(${containsConditions.join(' AND ')})`);
                    valueIndex += value.length;
                  } else {
                    conditions.push(`contains(${fieldName}, ${valueName})`);
                  }
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
                case 'intersects':
                  // For geospatial queries, we'll need to implement this differently
                  // as DynamoDB doesn't have native geospatial support
                  break;
                case 'less_than':
                  conditions.push(`${fieldName} < ${valueName}`);
                  break;
                case 'less_than_equal':
                  conditions.push(`${fieldName} <= ${valueName}`);
                  break;
                case 'like':
                  conditions.push(`contains(${fieldName}, ${valueName})`);
                  break;
                case 'near':
                  // For geospatial queries, we'll need to implement this differently
                  // as DynamoDB doesn't have native geospatial support
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
                case 'not_like':
                  conditions.push(`not contains(${fieldName}, ${valueName})`);
                  break;
                case 'within':
                  // For geospatial queries, we'll need to implement this differently
                  // as DynamoDB doesn't have native geospatial support
                  break;
              }
              valueIndex++;
            });
          } else {
            // Handle regular fields
            const fieldName = `#${field}`;
            queryParams.ExpressionAttributeNames[fieldName] = field;

            Object.entries(condition).forEach(([operator, value]) => {
              const valueName = `:v${valueIndex}`;
              queryParams.ExpressionAttributeValues[valueName] = value;

              switch (operator) {
                case 'all':
                  if (Array.isArray(value)) {
                    const allConditions = value.map((v, i) => {
                      const vName = `:v${valueIndex + i}`;
                      queryParams.ExpressionAttributeValues[vName] = v;
                      return `contains(${fieldName}, ${vName})`;
                    });
                    conditions.push(`(${allConditions.join(' AND ')})`);
                    valueIndex += value.length;
                  }
                  break;
                case 'contains':
                  if (Array.isArray(value)) {
                    // Handle array containment
                    const containsConditions = value.map((v, i) => {
                      const vName = `:v${valueIndex + i}`;
                      queryParams.ExpressionAttributeValues[vName] = v;
                      return `contains(${fieldName}, ${vName})`;
                    });
                    conditions.push(`(${containsConditions.join(' AND ')})`);
                    valueIndex += value.length;
                  } else {
                    conditions.push(`contains(${fieldName}, ${valueName})`);
                  }
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
                case 'intersects':
                  // For geospatial queries, we'll need to implement this differently
                  // as DynamoDB doesn't have native geospatial support
                  break;
                case 'less_than':
                  conditions.push(`${fieldName} < ${valueName}`);
                  break;
                case 'less_than_equal':
                  conditions.push(`${fieldName} <= ${valueName}`);
                  break;
                case 'like':
                  conditions.push(`contains(${fieldName}, ${valueName})`);
                  break;
                case 'near':
                  // For geospatial queries, we'll need to implement this differently
                  // as DynamoDB doesn't have native geospatial support
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
                case 'not_like':
                  conditions.push(`not contains(${fieldName}, ${valueName})`);
                  break;
                case 'within':
                  // For geospatial queries, we'll need to implement this differently
                  // as DynamoDB doesn't have native geospatial support
                  break;
              }
              valueIndex++;
            });
          }
        }
      });

      if (conditions.length > 0) {
        queryParams.FilterExpression = conditions.join(' AND ');
      }
    }
  }

  return queryParams;
};
