import type {
  CollectionConfig,
  DateField,
  Field,
  FlattenedBlock,
  FlattenedField,
  JoinField,
  RelationshipField,
  SanitizedConfig,
  TraverseFieldsCallback,
  UploadField,
} from 'payload';

import { flattenAllFields, traverseFields } from 'payload';
import { fieldAffectsData, fieldShouldBeLocalized } from 'payload/shared';

import type { DynamoDBAdapter } from '../index.js';

interface RelationObject {
  relationTo: string;
  value: number | string;
}

function isValidRelationObject(value: unknown): value is RelationObject {
  return typeof value === 'object' && value !== null && 'relationTo' in value && 'value' in value;
}

const convertRelationshipValue = ({
  operation,
  relatedCollection,
  validateRelationships,
  value,
}: {
  operation: Args['operation'];
  relatedCollection: CollectionConfig;
  validateRelationships?: boolean;
  value: unknown;
}) => {
  const customIDField = relatedCollection.fields.find(
    (field) => fieldAffectsData(field) && field.name === 'id'
  );

  if (operation === 'read') {
    return value;
  }

  if (customIDField) {
    return value;
  }

  return value;
};

const sanitizeRelationship = ({
  config,
  field,
  locale,
  operation,
  ref,
  validateRelationships,
  value,
}: {
  config: SanitizedConfig;
  field: JoinField | RelationshipField | UploadField;
  locale?: string;
  operation: Args['operation'];
  ref: Record<string, unknown>;
  validateRelationships?: boolean;
  value?: unknown;
}) => {
  if (field.type === 'join') {
    if (
      operation === 'read' &&
      value &&
      typeof value === 'object' &&
      'docs' in value &&
      Array.isArray(value.docs)
    ) {
      for (let i = 0; i < value.docs.length; i++) {
        const item = value.docs[i];
        if (Array.isArray(field.collection) && item) {
          value.docs[i] = JSON.parse(JSON.stringify(value.docs[i]));
        }
      }
    }

    return value;
  }

  let relatedCollection: CollectionConfig | undefined;
  let result = value;

  const hasManyRelations = typeof field.relationTo !== 'string';

  if (!hasManyRelations) {
    relatedCollection = config.collections?.find(({ slug }) => slug === field.relationTo);
  }

  if (Array.isArray(value)) {
    result = value.map((val) => {
      if (isValidRelationObject(val)) {
        const relatedCollectionForSingleValue = config.collections?.find(
          ({ slug }) => slug === val.relationTo
        );

        if (relatedCollectionForSingleValue) {
          return {
            relationTo: val.relationTo,
            value: convertRelationshipValue({
              operation,
              relatedCollection: relatedCollectionForSingleValue,
              validateRelationships,
              value: val.value,
            }),
          };
        }
      }

      if (relatedCollection) {
        return convertRelationshipValue({
          operation,
          relatedCollection,
          validateRelationships,
          value: val,
        });
      }

      return val;
    });
  } else if (isValidRelationObject(value)) {
    relatedCollection = config.collections?.find(({ slug }) => slug === value.relationTo);

    if (relatedCollection) {
      result = {
        relationTo: value.relationTo,
        value: convertRelationshipValue({
          operation,
          relatedCollection,
          validateRelationships,
          value: value.value,
        }),
      };
    }
  } else if (relatedCollection) {
    result = convertRelationshipValue({
      operation,
      relatedCollection,
      validateRelationships,
      value,
    });
  }

  if (locale) {
    ref[locale] = result;
  } else {
    ref[field.name] = result;
  }
};

const sanitizeDate = ({
  field,
  locale,
  ref,
  value,
}: {
  field: DateField;
  locale?: string;
  ref: Record<string, unknown>;
  value: unknown;
}) => {
  if (!value) {
    return;
  }

  if (value instanceof Date) {
    value = value.toISOString();
  }

  if (locale) {
    ref[locale] = value;
  } else {
    ref[field.name] = value;
  }
};

type Args = {
  adapter: DynamoDBAdapter;
  data: Record<string, unknown> | Record<string, unknown>[];
  fields: Field[];
  globalSlug?: string;
  operation: 'read' | 'write';
  parentIsLocalized?: boolean;
  validateRelationships?: boolean;
};

const stripFields = ({
  config,
  data,
  fields,
  reservedKeys = [],
}: {
  config: SanitizedConfig;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  fields: FlattenedField[];
  reservedKeys?: string[];
}) => {
  for (const k in data) {
    if (!fields.some((field) => field.name === k) && !reservedKeys.includes(k)) {
      delete data[k];
    }
  }

  for (const field of fields) {
    reservedKeys = [];
    const fieldData = data[field.name];
    if (!fieldData || typeof fieldData !== 'object') {
      continue;
    }

    if (field.type === 'blocks') {
      reservedKeys.push('blockType');
    }

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

          stripFields({
            config,
            data: localeData,
            fields: 'flattenedFields' in field ? field.flattenedFields : [],
            reservedKeys,
          });
        }
      } else {
        stripFields({
          config,
          data: fieldData,
          fields: 'flattenedFields' in field ? field.flattenedFields : [],
          reservedKeys,
        });
      }
    }
  }
};

export const transform = ({
  adapter,
  data,
  fields,
  globalSlug,
  operation,
  parentIsLocalized = false,
  validateRelationships = true,
}: Args) => {
  if (Array.isArray(data)) {
    for (const item of data) {
      transform({ adapter, data: item, fields, globalSlug, operation, validateRelationships });
    }
    return;
  }

  const {
    payload: { config },
  } = adapter;

  if (operation === 'read') {
    data.id = data.id || data._id;
    delete data._id;

    if (!adapter.allowAdditionalKeys) {
      stripFields({
        config,
        data,
        fields: flattenAllFields({ cache: true, fields }),
        reservedKeys: ['id', 'globalType'],
      });
    }
  }

  if (operation === 'write' && globalSlug) {
    data.globalType = globalSlug;
  }

  const sanitize: TraverseFieldsCallback = ({ field, ref: incomingRef }) => {
    if (!incomingRef || typeof incomingRef !== 'object') {
      return;
    }

    const ref = incomingRef as Record<string, unknown>;

    if (field.type === 'date' && operation === 'read' && field.name in ref && ref[field.name]) {
      if (config.localization && fieldShouldBeLocalized({ field, parentIsLocalized })) {
        const fieldRef = ref[field.name];
        if (!fieldRef || typeof fieldRef !== 'object') {
          return;
        }

        const typedFieldRef = fieldRef as Record<string, unknown>;
        for (const locale of config.localization.localeCodes) {
          sanitizeDate({
            field,
            ref: typedFieldRef,
            value: typedFieldRef[locale],
          });
        }
      } else {
        sanitizeDate({
          field,
          ref,
          value: ref[field.name],
        });
      }
    }

    if (
      field.type === 'relationship' ||
      field.type === 'upload' ||
      (operation === 'read' && field.type === 'join')
    ) {
      if (!ref[field.name]) {
        return;
      }

      if (config.localization && fieldShouldBeLocalized({ field, parentIsLocalized })) {
        const locales = config.localization.locales;
        const fieldRef = ref[field.name];
        if (!fieldRef || typeof fieldRef !== 'object') {
          return;
        }

        const typedFieldRef = fieldRef as Record<string, unknown>;
        for (const { code } of locales) {
          const value = typedFieldRef[code];
          if (value) {
            sanitizeRelationship({
              config,
              field,
              locale: code,
              operation,
              ref: typedFieldRef,
              validateRelationships,
              value,
            });
          }
        }
      } else {
        sanitizeRelationship({
          config,
          field,
          locale: undefined,
          operation,
          ref,
          validateRelationships,
          value: ref[field.name],
        });
      }
    }
  };

  traverseFields({
    callback: sanitize,
    config,
    fields,
    fillEmpty: false,
    parentIsLocalized,
    ref: data as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });
};
