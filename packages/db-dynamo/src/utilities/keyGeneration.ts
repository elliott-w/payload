import { KEY_NAMES } from './constants';

export const generateCollectionKeys = (collectionSlug: string, id: string) => ({
  [KEY_NAMES.GSI1_PARTITION_KEY]: `DOCUMENT#${id}`,
  [KEY_NAMES.GSI1_SORT_KEY]: `COLLECTION#${collectionSlug}`,
  [KEY_NAMES.PARTITION_KEY]: `COLLECTION#${collectionSlug}`,
  [KEY_NAMES.SORT_KEY]: `DOCUMENT#${id}`,
});

export const generateGlobalKeys = (globalSlug: string) => ({
  [KEY_NAMES.GSI1_PARTITION_KEY]: 'GLOBAL',
  [KEY_NAMES.GSI1_SORT_KEY]: `DOCUMENT#${globalSlug}`,
  [KEY_NAMES.PARTITION_KEY]: `GLOBAL#${globalSlug}`,
  [KEY_NAMES.SORT_KEY]: 'DOCUMENT',
});

export const generateVersionKeys = (
  collectionSlug: string,
  documentId: string,
  versionId: string
) => ({
  [KEY_NAMES.GSI1_PARTITION_KEY]: `DOCUMENT#${documentId}`,
  [KEY_NAMES.GSI1_SORT_KEY]: `VERSION#${versionId}`,
  [KEY_NAMES.GSI2_PARTITION_KEY]: `COLLECTION#${collectionSlug}`,
  [KEY_NAMES.GSI2_SORT_KEY]: `VERSION#${versionId}`,
  [KEY_NAMES.PARTITION_KEY]: `VERSION#${collectionSlug}#${documentId}`,
  [KEY_NAMES.SORT_KEY]: versionId,
});

export const generateGlobalVersionKeys = (globalSlug: string, versionId: string) => ({
  [KEY_NAMES.GSI1_PARTITION_KEY]: `GLOBAL#${globalSlug}`,
  [KEY_NAMES.GSI1_SORT_KEY]: `VERSION#${versionId}`,
  [KEY_NAMES.PARTITION_KEY]: `GLOBALVERSION#${globalSlug}`,
  [KEY_NAMES.SORT_KEY]: versionId,
});

export const generateMigrationKeys = (migrationName: string) => ({
  [KEY_NAMES.PARTITION_KEY]: 'MIGRATION',
  [KEY_NAMES.SORT_KEY]: migrationName,
});
