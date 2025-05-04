import type { SanitizedCollectionConfig, SanitizedGlobalConfig } from 'payload';

interface GetTableNameArgs {
  config: SanitizedCollectionConfig | SanitizedGlobalConfig;
  versions?: boolean;
}

export function getTableName({ config, versions = false }: GetTableNameArgs): string {
  const prefix = 'payload_';
  const suffix = versions ? '_versions' : '';
  return `${prefix}${config.slug}${suffix}`;
}
