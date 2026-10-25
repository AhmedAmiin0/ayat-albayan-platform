// Click-to-chat for E.164 phones (rule 7). Display grouping is @ab/shared formatPhone, inside <Ltr>.

/**
 * WhatsApp click-to-chat (wa.me fallback, R-MSG-03): digits only, optional prefilled text.
 * Open it with Linking.openURL.
 */
export function whatsappLink(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
