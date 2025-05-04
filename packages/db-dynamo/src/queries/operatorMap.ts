import type { Where } from 'payload';

export type DynamoDBOperator =
  | '<'
  | '<='
  | '<>'
  | '='
  | '>'
  | '>='
  | 'attribute_exists'
  | 'attribute_not_exists'
  | 'begins_with'
  | 'BETWEEN'
  | 'contains'
  | 'IN';

export const operatorMap: Record<string, DynamoDBOperator> = {
  $eq: '=',
  $exists: 'attribute_exists',
  $gt: '>',
  $gte: '>=',
  $in: 'IN',
  $lt: '<',
  $lte: '<=',
  $ne: '<>',
  $nin: '<>', // Not IN is handled in buildQuery.ts
  $not: 'attribute_not_exists',
  $regex: 'contains', // Note: DynamoDB doesn't support regex natively, this is a simplified implementation
  $startsWith: 'begins_with',
};

export const isLogicalOperator = (operator: string): boolean => {
  return ['$and', '$nor', '$or'].includes(operator);
};

export const isComparisonOperator = (operator: string): boolean => {
  return Object.keys(operatorMap).includes(operator);
};

export const getDynamoDBOperator = (operator: string): DynamoDBOperator | undefined => {
  return operatorMap[operator];
};

export const isWhereOperator = (value: any): value is Where => {
  return (
    value &&
    typeof value === 'object' &&
    Object.keys(value).some((key) => isComparisonOperator(key) || isLogicalOperator(key))
  );
};
