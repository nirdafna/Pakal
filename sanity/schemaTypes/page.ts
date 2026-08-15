import { defineField, defineType } from 'sanity';

export const page = defineType({
  name: 'page',
  title: 'עמוד תוכן',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'כותרת', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'מזהה העמוד',
      type: 'string',
      description: 'how-to-play / corporate / faq',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'body', title: 'תוכן', type: 'array', of: [{ type: 'block' }] }),
  ],
});
