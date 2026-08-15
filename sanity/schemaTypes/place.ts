import { defineField, defineType } from 'sanity';

export const place = defineType({
  name: 'place',
  title: 'אתר או מסלול',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'שם',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'כתובת בקישור (באנגלית)',
      type: 'slug',
      description: 'אותיות אנגליות ומקפים בלבד, למשל ein-gedi',
      options: { source: 'title', slugify: (input) => input.toLowerCase().replace(/\s+/g, '-') },
      validation: (rule) =>
        rule.required().custom((value) =>
          !value?.current || /^[a-z0-9-]+$/.test(value.current)
            ? true
            : 'רק אותיות אנגליות קטנות, ספרות ומקפים',
        ),
    }),
    defineField({
      name: 'kind',
      title: 'סוג',
      type: 'string',
      options: {
        list: [
          { title: 'מסלול', value: 'trek' },
          { title: 'אתר', value: 'site' },
        ],
        layout: 'radio',
      },
      initialValue: 'trek',
    }),
    defineField({ name: 'region', title: 'אזור', type: 'string' }),
    defineField({
      name: 'summary',
      title: 'תקציר',
      type: 'text',
      rows: 3,
      description: 'מופיע ברשימת המסלולים ובתוצאות החיפוש בגוגל',
    }),
    defineField({ name: 'body', title: 'תוכן', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'images',
      title: 'תמונות',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', title: 'תיאור התמונה', type: 'string' }],
        },
      ],
    }),
    defineField({ name: 'lengthKm', title: 'אורך (ק"מ)', type: 'number' }),
    defineField({ name: 'durationHours', title: 'משך (שעות)', type: 'number' }),
    defineField({ name: 'difficulty', title: 'רמת קושי', type: 'string' }),
    defineField({ name: 'season', title: 'עונה מומלצת', type: 'string' }),
    defineField({ name: 'mapUrl', title: 'קישור למפה', type: 'url' }),
    defineField({ name: 'tips', title: 'טיפים', type: 'text', rows: 4 }),
  ],
  preview: { select: { title: 'title', subtitle: 'region' } },
});
