import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'הגדרות האתר',
  type: 'document',
  fields: [
    defineField({
      name: 'whatsappPhone',
      title: 'מספר וואטסאפ',
      type: 'string',
      description: 'כולל קידומת מדינה, למשל 972501234567',
    }),
    defineField({ name: 'purchaseMessage', title: 'הודעת רכישה', type: 'string' }),
    defineField({ name: 'corporateMessage', title: 'הודעת מתנה לחברות', type: 'string' }),
    defineField({ name: 'heroTitle', title: 'כותרת ראשית', type: 'string' }),
    defineField({ name: 'heroTagline', title: 'סלוגן', type: 'string' }),
    defineField({ name: 'heroText', title: 'טקסט פתיחה', type: 'text', rows: 3 }),
    defineField({ name: 'heroImage', title: 'תמונת פתיחה', type: 'image' }),
  ],
});
