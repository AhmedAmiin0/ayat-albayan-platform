// Display and click-to-chat for E.164 phones (rule 7). Render the result inside <Ltr>.

/**
 * WhatsApp click-to-chat (wa.me fallback, R-MSG-03): digits only, optional prefilled text.
 * Open it with Linking.openURL.
 */
export function whatsappLink(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

const GROUPS: { prefix: string; sizes: number[] }[] = [
  { prefix: '+966', sizes: [2, 3, 4] }, // +966 55 214 7730
  { prefix: '+20', sizes: [2, 4, 4] }, // +20 10 1234 5678
];

/** «+966 55 214 7730». Saudi and Egyptian mobiles are grouped; any other number is left as stored. */
export function formatPhoneDisplay(phoneE164: string): string {
  const rule = GROUPS.find((g) => phoneE164.startsWith(g.prefix));
  const rest = rule ? phoneE164.slice(rule.prefix.length) : '';
  if (!rule || rest.length !== rule.sizes.reduce((a, b) => a + b, 0)) return phoneE164;
  const parts = [rule.prefix];
  let at = 0;
  for (const size of rule.sizes) {
    parts.push(rest.slice(at, at + size));
    at += size;
  }
  return parts.join(' ');
}
