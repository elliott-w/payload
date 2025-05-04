import type {
  ArrayField,
  BaseDatabaseAdapter,
  BlocksField,
  CheckboxField,
  CodeField,
  CollapsibleField,
  CollectionSlug,
  DatabaseAdapterObj,
  DateField,
  EmailField,
  Field,
  GroupField,
  JoinField,
  JSONField,
  Migration,
  NumberField,
  Payload,
  PayloadRequest,
  PointField,
  RadioField,
  RelationshipField,
  RichTextField,
  RowField,
  SanitizedConfig,
  SelectField,
  TabsField,
  TextareaField,
  TextField,
  TypeWithID,
  TypeWithVersion,
  UpdateGlobalArgs,
  UpdateGlobalVersionArgs,
  UpdateOneArgs,
  UpdateVersionArgs,
  UploadField,
} from 'payload';

export interface DynamoDBAdapterConfig {
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  migrationDir?: string;
  region?: string;
}

export interface DynamoDBAdapterOptions {
  config: DynamoDBAdapterConfig;
  payload: Payload;
}

export interface DynamoDBError extends Error {
  code?: string;
  message: string;
  statusCode?: number;
}

export interface CollectionWithSlug {
  slug: CollectionSlug;
}

export interface GlobalWithSlug {
  slug: string;
}

export type BuildSchema<TSchema> = (args: {
  config: SanitizedConfig;
  fields: Field[];
  options: BuildSchemaOptions;
}) => TSchema;

export type BuildSchemaOptions = {
  allowIDField?: boolean;
  disableUnique?: boolean;
  draftsEnabled?: boolean;
  indexSortableFields?: boolean;
};

export type FieldGenerator<TSchema, TField> = {
  config: SanitizedConfig;
  field: TField;
  options: BuildSchemaOptions;
  schema: TSchema;
};

export type FieldGeneratorFunction<TSchema, TField extends Field> = (
  args: FieldGenerator<TSchema, TField>
) => void;

export type FieldToSchemaMap<TSchema> = {
  array: FieldGeneratorFunction<TSchema, ArrayField>;
  blocks: FieldGeneratorFunction<TSchema, BlocksField>;
  checkbox: FieldGeneratorFunction<TSchema, CheckboxField>;
  code: FieldGeneratorFunction<TSchema, CodeField>;
  collapsible: FieldGeneratorFunction<TSchema, CollapsibleField>;
  date: FieldGeneratorFunction<TSchema, DateField>;
  email: FieldGeneratorFunction<TSchema, EmailField>;
  group: FieldGeneratorFunction<TSchema, GroupField>;
  join: FieldGeneratorFunction<TSchema, JoinField>;
  json: FieldGeneratorFunction<TSchema, JSONField>;
  number: FieldGeneratorFunction<TSchema, NumberField>;
  point: FieldGeneratorFunction<TSchema, PointField>;
  radio: FieldGeneratorFunction<TSchema, RadioField>;
  relationship: FieldGeneratorFunction<TSchema, RelationshipField>;
  richText: FieldGeneratorFunction<TSchema, RichTextField>;
  row: FieldGeneratorFunction<TSchema, RowField>;
  select: FieldGeneratorFunction<TSchema, SelectField>;
  tabs: FieldGeneratorFunction<TSchema, TabsField>;
  text: FieldGeneratorFunction<TSchema, TextField>;
  textarea: FieldGeneratorFunction<TSchema, TextareaField>;
  upload: FieldGeneratorFunction<TSchema, UploadField>;
};

export type MigrateUpArgs = {
  payload: Payload;
  req: any; // TODO: Import proper type from payload
};

export type MigrateDownArgs = {
  payload: Payload;
  req: any; // TODO: Import proper type from payload
};
