import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me link from a plain number', () => {
    expect(buildWhatsAppUrl('972501234567', 'שלום')).toBe(
      'https://wa.me/972501234567?text=%D7%A9%D7%9C%D7%95%D7%9D',
    );
  });

  it('strips spaces, dashes and plus signs from the phone number', () => {
    expect(buildWhatsAppUrl('+972 50-123-4567', 'hi')).toBe('https://wa.me/972501234567?text=hi');
  });

  it('omits the text parameter when the message is empty', () => {
    expect(buildWhatsAppUrl('972501234567', '')).toBe('https://wa.me/972501234567');
  });

  it('returns null when the phone number has no digits', () => {
    expect(buildWhatsAppUrl('', 'hi')).toBeNull();
    expect(buildWhatsAppUrl('לא-מספר', 'hi')).toBeNull();
  });
});
