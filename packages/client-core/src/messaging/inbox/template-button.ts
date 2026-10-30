import { templateButtonLink, type TemplateButtonKind, type TemplateDisplayButton } from '@ab/shared';

// A template button's words for web and mobile (owner 2026-10-28): Meta's label, else its kind's,
// and what a hover or a screen reader says. The words are `inbox.templateBubble` of ar.json / en.json.

export interface TemplateButtonWords {
  button: Record<TemplateButtonKind, string>;
  displayOnly: string;
  opensLink: string;
  callNumber: string;
}

/** Meta's label, else the kind's own («فتح الرابط»): a button is never blank. */
export const templateButtonLabel = (b: TemplateDisplayButton, words: TemplateButtonWords): string =>
  b.text.trim() || words.button[b.type];

/** A link opens; a call says its number; the rest is the family's to tap in WhatsApp. */
export function templateButtonHint(b: TemplateDisplayButton, words: TemplateButtonWords): string {
  const label = templateButtonLabel(b, words);
  if (templateButtonLink(b)) return words.opensLink.replace('{label}', label);
  if (b.type === 'phone_number' && b.phone) return words.callNumber.replace('{label}', label).replace('{phone}', b.phone);
  return words.displayOnly.replace('{label}', label);
}
