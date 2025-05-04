import type { Where } from 'payload';

import { isLogicalOperator, isWhereOperator } from './operatorMap.js';

export type ConditionExpression = {
  attributeNames: Record<string, string>;
  attributeValues: Record<string, any>;
  expression: string;
};

export const buildAndOrConditions = (where: Where, prefix: string = ''): ConditionExpression => {
  const conditions: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};
  let counter = 0;

  for (const [key, value] of Object.entries(where)) {
    if (isLogicalOperator(key)) {
      const logicalConditions = (Array.isArray(value) ? value : [value]).map((condition, index) => {
        const subCondition = buildAndOrConditions(
          condition as Where,
          `${prefix}${counter}_${index}_`
        );
        Object.assign(attributeNames, subCondition.attributeNames);
        Object.assign(attributeValues, subCondition.attributeValues);
        return subCondition.expression;
      });

      const operator = key === '$and' ? ' AND ' : ' OR ';
      conditions.push(`(${logicalConditions.join(operator)})`);
    } else if (isWhereOperator(value)) {
      const subCondition = buildAndOrConditions(value, `${prefix}${counter}_`);
      Object.assign(attributeNames, subCondition.attributeNames);
      Object.assign(attributeValues, subCondition.attributeValues);
      conditions.push(subCondition.expression);
    } else {
      const attributeName = `#${prefix}${counter}`;
      const attributeValue = `:${prefix}${counter}`;

      attributeNames[attributeName] = key;
      attributeValues[attributeValue] = value;

      conditions.push(`${attributeName} = ${attributeValue}`);
    }
    counter++;
  }

  return {
    attributeNames,
    attributeValues,
    expression: conditions.join(' AND '),
  };
};
