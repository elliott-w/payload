import type { CollectionConfig, Field, FlattenedField, SanitizedConfig } from 'payload';

import { flattenAllFields } from 'payload';
import { fieldAffectsData } from 'payload/shared';

import type { DynamoDBAdapter } from '../index.js';

/**
 * Converts a DynamoDB item to a format suitable for Payload CMS
 * @param item The DynamoDB item to convert
 * @returns The converted item
 */
export const convertFromDynamoDB = (item: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(item)) {
    if (key === 'id') {
      result.id = value;
    } else if (key === 'createdAt' || key === 'updatedAt') {
      result[key] = new Date(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => {
        if (typeof v === 'object' && v !== null) {
          return convertFromDynamoDB(v);
        }
        return v;
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = convertFromDynamoDB(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Converts a Payload CMS document to a format suitable for DynamoDB
 * @param doc The document to convert
 * @returns The converted document
 */
export const convertToDynamoDB = (doc: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(doc)) {
    if (key === 'id') {
      result.id = value;
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => {
        if (typeof v === 'object' && v !== null) {
          return convertToDynamoDB(v);
        }
        return v;
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = convertToDynamoDB(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Strips fields that are not defined in the schema
 * @param config The Payload CMS config
 * @param data The data to strip
 * @param fields The fields to keep
 * @param reservedKeys Additional keys to keep
 */
export const stripUndefinedFields = ({
  config,
  data,
  fields,
  reservedKeys = [],
}: {
  config: SanitizedConfig;
  data: Record<string, any>;
  fields: Field[];
  reservedKeys?: string[];
}): void => {
  const flattenedFields = flattenAllFields({ cache: true, fields });

  for (const key in data) {
    if (!flattenedFields.some((field) => field.name === key) && !reservedKeys.includes(key)) {
      delete data[key];
    }
  }

  for (const field of flattenedFields) {
    const fieldData = data[field.name];
    if (!fieldData || typeof fieldData !== 'object') {
      continue;
    }

    const fieldReservedKeys = field.type === 'blocks' ? ['blockType'] : [];

    if ('flattenedFields' in field || 'blocks' in field) {
      if (field.localized && config.localization) {
        for (const localeKey in fieldData) {
          if (!config.localization.localeCodes.some((code) => code === localeKey)) {
            delete fieldData[localeKey];
            continue;
          }

          const localeData = fieldData[localeKey] as Record<string, unknown>;
          if (!localeData || typeof localeData !== 'object') {
            continue;
          }

          stripUndefinedFields({
            config,
            data: localeData,
            fields: 'flattenedFields' in field ? field.fields : [],
            reservedKeys: fieldReservedKeys,
          });
        }
      } else {
        stripUndefinedFields({
          config,
          data: fieldData,
          fields: 'flattenedFields' in field ? field.fields : [],
          reservedKeys: fieldReservedKeys,
        });
      }
    }
  }
};

/**
 * Validates a document against its schema
 * @param config The Payload CMS config
 * @param data The data to validate
 * @param fields The fields to validate against
 * @returns true if valid, false otherwise
 */
export const validateDocument = ({
  config,
  data,
  fields,
}: {
  config: SanitizedConfig;
  data: Record<string, any>;
  fields: Field[];
}): boolean => {
  const flattenedFields = flattenAllFields({ cache: true, fields });

  for (const field of flattenedFields) {
    if (fieldAffectsData(field) && 'required' in field && field.required && !data[field.name]) {
      return false;
    }

    const fieldData = data[field.name];
    if (!fieldData || typeof fieldData !== 'object') {
      continue;
    }

    if ('flattenedFields' in field || 'blocks' in field) {
      if (field.localized && config.localization) {
        for (const localeKey in fieldData) {
          if (!config.localization.localeCodes.some((code) => code === localeKey)) {
            return false;
          }

          const localeData = fieldData[localeKey] as Record<string, unknown>;
          if (!localeData || typeof localeData !== 'object') {
            continue;
          }

          if (
            !validateDocument({
              config,
              data: localeData,
              fields: 'flattenedFields' in field ? field.fields : [],
            })
          ) {
            return false;
          }
        }
      } else {
        if (
          !validateDocument({
            config,
            data: fieldData,
            fields: 'flattenedFields' in field ? field.fields : [],
          })
        ) {
          return false;
        }
      }
    }
  }

  return true;
};
