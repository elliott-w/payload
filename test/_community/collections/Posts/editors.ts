import {
  BlocksFeature,
  InlineToolbarFeature,
  lexicalEditor,
  TextStateFeature,
} from '@payloadcms/richtext-lexical'
import { type Block } from 'payload'

const CustomTextStateFeature = TextStateFeature({
  state: {
    color: {
      red: {
        label: 'Red',
        css: {
          color: 'red',
        },
      },
    },
  },
})

const testBlockEditor = lexicalEditor({
  features: [CustomTextStateFeature, InlineToolbarFeature()],
})

const TestBlock: Block = {
  slug: 'testBlock',
  fields: [
    {
      name: 'contentNested',
      type: 'richText',
      editor: testBlockEditor,
    },
  ],
}

export const fullEditor = lexicalEditor({
  features: [
    CustomTextStateFeature,
    InlineToolbarFeature(),
    BlocksFeature({
      blocks: [TestBlock],
    }),
  ],
})
