import { KEY_NAMES } from './constants.js';

interface QueryBuilderOptions {
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  filterExpression?: string;
  indexName?: string;
  limit?: number;
  startKey?: Record<string, any>;
}

export const buildQuery = (
  tableName: string,
  partitionKey: string,
  sortKey?: string,
  options: QueryBuilderOptions = {}
) => {
  const {
    expressionAttributeNames = {},
    expressionAttributeValues = {},
    filterExpression,
    indexName,
    limit,
    startKey,
  } = options;

  const keyConditionExpressions: string[] = ['#pk = :pk'];
  const baseExpressionAttributeNames: Record<string, string> = {
    '#pk': indexName ? KEY_NAMES.GSI1_PARTITION_KEY : KEY_NAMES.PARTITION_KEY,
    ...expressionAttributeNames,
  };
  const baseExpressionAttributeValues: Record<string, any> = {
    ':pk': partitionKey,
    ...expressionAttributeValues,
  };

  if (sortKey) {
    keyConditionExpressions.push('#sk = :sk');
    baseExpressionAttributeNames['#sk'] = indexName ? KEY_NAMES.GSI1_SORT_KEY : KEY_NAMES.SORT_KEY;
    baseExpressionAttributeValues[':sk'] = sortKey;
  }

  return {
    TableName: tableName,
    ...(indexName && { IndexName: indexName }),
    ExpressionAttributeNames: baseExpressionAttributeNames,
    ExpressionAttributeValues: baseExpressionAttributeValues,
    KeyConditionExpression: keyConditionExpressions.join(' AND '),
    ...(filterExpression && { FilterExpression: filterExpression }),
    ...(limit && { Limit: limit }),
    ...(startKey && { ExclusiveStartKey: startKey }),
  };
};

export const buildFilterExpression = (where: Record<string, any> = {}) => {
  const expressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};
  let valueCounter = 0;

  Object.entries(where).forEach(([key, value]) => {
    const attributeName = `#attr${valueCounter}`;
    const attributeValue = `:val${valueCounter}`;

    expressionAttributeNames[attributeName] = key;
    expressionAttributeValues[attributeValue] = value;

    if (value === null) {
      expressionParts.push(`attribute_not_exists(${attributeName})`);
    } else if (typeof value === 'object') {
      // Handle operators like $eq, $gt, $lt, etc.
      Object.entries(value).forEach(([operator, operatorValue]) => {
        const operatorValueKey = `${attributeValue}_${operator}`;
        expressionAttributeValues[operatorValueKey] = operatorValue;

        switch (operator) {
          case '$contains':
            expressionParts.push(`contains(${attributeName}, ${operatorValueKey})`);
            break;
          case '$eq':
            expressionParts.push(`${attributeName} = ${operatorValueKey}`);
            break;
          case '$exists':
            if (operatorValue) {
              expressionParts.push(`attribute_exists(${attributeName})`);
            } else {
              expressionParts.push(`attribute_not_exists(${attributeName})`);
            }
            break;
          case '$gt':
            expressionParts.push(`${attributeName} > ${operatorValueKey}`);
            break;
          case '$gte':
            expressionParts.push(`${attributeName} >= ${operatorValueKey}`);
            break;
          case '$in':
            if (Array.isArray(operatorValue)) {
              expressionParts.push(
                `${attributeName} IN (${operatorValue
                  .map((_, i) => `${operatorValueKey}_${i}`)
                  .join(', ')})`
              );
              operatorValue.forEach((val, i) => {
                expressionAttributeValues[`${operatorValueKey}_${i}`] = val;
              });
            }
            break;
          case '$lt':
            expressionParts.push(`${attributeName} < ${operatorValueKey}`);
            break;
          case '$lte':
            expressionParts.push(`${attributeName} <= ${operatorValueKey}`);
            break;
          case '$ne':
            expressionParts.push(`${attributeName} <> ${operatorValueKey}`);
            break;
        }
      });
    } else {
      expressionParts.push(`${attributeName} = ${attributeValue}`);
    }

    valueCounter += 1;
  });

  return {
    expressionAttributeNames,
    expressionAttributeValues,
    filterExpression: expressionParts.join(' AND '),
  };
};
