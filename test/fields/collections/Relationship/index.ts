import type { CollectionConfig } from 'payload'

import { relationshipFieldsSlug } from '../../slugs.js'

const RelationshipFields: CollectionConfig = {
  fields: [
    {
      name: 'text',
      type: 'text',
    },
    {
      name: 'relationship',
      relationTo: ['text-fields', 'array-fields'],
      required: true,
      type: 'relationship',
      admin: {
        sortOptions: {
          'text-fields': '-id',
          'array-fields': '-id',
        },
      },
    },
    {
      name: 'relationHasManyPolymorphic',
      type: 'relationship',
      relationTo: ['text-fields', 'array-fields'],
      hasMany: true,
      admin: {
        sortOptions: {
          'text-fields': '-text',
        },
      },
    },
    {
      name: 'relationToSelf',
      relationTo: relationshipFieldsSlug,
      type: 'relationship',
    },
    {
      name: 'relationToSelfSelectOnly',
      relationTo: relationshipFieldsSlug,
      type: 'relationship',
    },
    {
      name: 'relationWithAllowCreateToFalse',
      admin: {
        allowCreate: false,
      },
      defaultValue: ({ user }) => user?.id,
      relationTo: 'users',
      type: 'relationship',
    },
    {
      name: 'relationWithAllowEditToFalse',
      admin: {
        allowEdit: false,
      },
      defaultValue: ({ user }) => user?.id,
      relationTo: 'users',
      type: 'relationship',
    },
    {
      name: 'relationWithDynamicDefault',
      defaultValue: ({ user }) => user?.id,
      relationTo: 'users',
      type: 'relationship',
    },
    {
      name: 'relationHasManyWithDynamicDefault',
      defaultValue: ({ user }) =>
        user
          ? {
              relationTo: 'users',
              value: user.id,
            }
          : undefined,
      relationTo: ['users'],
      type: 'relationship',
    },
    {
      name: 'relationshipWithMin',
      hasMany: true,
      minRows: 2,
      relationTo: 'text-fields',
      type: 'relationship',
    },
    {
      name: 'relationshipWithMax',
      hasMany: true,
      maxRows: 2,
      relationTo: 'text-fields',
      type: 'relationship',
    },
    {
      name: 'relationshipHasMany',
      hasMany: true,
      relationTo: 'text-fields',
      type: 'relationship',
    },
    {
      name: 'array',
      fields: [
        {
          name: 'relationship',
          relationTo: 'text-fields',
          type: 'relationship',
        },
      ],
      type: 'array',
    },
    {
      name: 'relationshipWithMinRows',
      relationTo: ['text-fields'],
      hasMany: true,
      minRows: 2,
      type: 'relationship',
    },
    {
      name: 'relationToRow',
      relationTo: 'row-fields',
      type: 'relationship',
    },
    {
      name: 'relationToRowMany',
      relationTo: 'row-fields',
      type: 'relationship',
      hasMany: true,
    },
    {
      name: 'relationshipDrawer',
      relationTo: 'text-fields',
      admin: { appearance: 'drawer' },
      type: 'relationship',
    },
    {
      name: 'relationshipDrawerReadOnly',
      relationTo: 'text-fields',
      admin: {
        readOnly: true,
        appearance: 'drawer',
      },
      type: 'relationship',
    },
    {
      name: 'polymorphicRelationshipDrawer',
      admin: { appearance: 'drawer' },
      type: 'relationship',
      relationTo: ['text-fields', 'array-fields'],
    },
    {
      name: 'relationshipDrawerHasMany',
      relationTo: 'text-fields',
      admin: {
        appearance: 'drawer',
      },
      hasMany: true,
      type: 'relationship',
    },
    {
      name: 'relationshipDrawerHasManyPolymorphic',
      relationTo: ['text-fields', 'array-fields'],
      admin: {
        appearance: 'drawer',
      },
      hasMany: true,
      type: 'relationship',
    },
    {
      name: 'relationshipDrawerWithAllowCreateFalse',
      admin: {
        allowCreate: false,
        appearance: 'drawer',
      },
      type: 'relationship',
      relationTo: 'text-fields',
    },
    {
      name: 'relationshipDrawerWithFilterOptions',
      admin: { appearance: 'drawer' },
      type: 'relationship',
      relationTo: ['text-fields'],
      filterOptions: ({ relationTo }) => {
        if (relationTo === 'text-fields') {
          return {
            text: {
              equals: 'list drawer test',
            },
          }
        } else {
          return true
        }
      },
    },
  ],
  slug: relationshipFieldsSlug,
}

export default RelationshipFields
