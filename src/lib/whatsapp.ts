/**
 * Builds a wa.me deep link. Returns null when the phone number contains no
 * digits, so callers can omit the CTA entirely rather than render a dead link.
 */
export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;

  const base = `https://wa.me/${digits}`;
  if (message.length === 0) return base;

  return `${base}?text=${encodeURIComponent(message)}`;
}
