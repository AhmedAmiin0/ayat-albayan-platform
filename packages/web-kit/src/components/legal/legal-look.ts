/** Bullets or numbers for a LegalSection's points. */
export const LEGAL_LIST_CLASS = { ol: 'list-decimal', ul: 'list-disc' } as const;

/** An email opens the mail app in place; a site opens in a new tab, without the opener. */
export const CONTACT_TARGET = {
  email: {},
  site: { target: '_blank', rel: 'noopener noreferrer' },
} as const;
