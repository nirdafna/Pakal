import { defineField, defineType } from 'sanity';

export const card = defineType({
  name: 'card',
  title: 'קלף',
  type: 'document',
  fields: [
    defineField({
      name: 'number',
      title: 'מספר הקלף',
      type: 'number',
      description: 'המספר שמופיע בקישור ה-QR שעל גב הקלף. אין לשנות אחרי הדפסה.',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'label',
      title: 'זיהוי הקלף',
      type: 'string',
      description: 'לדוגמה: 7 תלתן',
    }),
    defineField({
      name: 'place',
      title: 'האתר או המסלול המקושר',
      type: 'reference',
      to: [{ type: 'place' }],
      description: 'אפשר להשאיר ריק — הקלף יוביל לדף הבית עד שיקושר',
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'place.title' } },
});
