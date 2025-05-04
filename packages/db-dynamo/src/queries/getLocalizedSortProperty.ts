import type { FlattenedField, SanitizedConfig } from 'payload';

type Args = {
  config: SanitizedConfig;
  fields: FlattenedField[];
  locale?: string;
  parentIsLocalized?: boolean;
  segments: string[];
};

export const getLocalizedSortProperty = ({
  config,
  fields,
  locale,
  parentIsLocalized = false,
  segments,
}: Args): string => {
  let currentFields = fields;
  let path = '';
  let isLocalized = parentIsLocalized;

  for (const [i, segment] of segments.entries()) {
    const field = currentFields.find((f) => f.name === segment);

    if (!field) {
      return segments.join('.');
    }

    if ('fields' in field) {
      currentFields = field.flattenedFields;
      path += `${segment}.`;
      continue;
    }

    if (field.localized && !isLocalized) {
      isLocalized = true;
      if (locale) {
        path += `${segment}.${locale}`;
      } else if (config.localization && typeof config.localization === 'object') {
        path += `${segment}.${config.localization.defaultLocale}`;
      } else {
        path += segment;
      }
    } else {
      path += segment;
    }

    if (i < segments.length - 1) {
      path += '.';
    }
  }

  return path;
};
