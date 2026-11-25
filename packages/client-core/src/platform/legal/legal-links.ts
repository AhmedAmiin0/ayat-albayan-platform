import type { LegalPage } from './legal.types';

/** The family portal (apps/family-web): the store listing and the app link its legal pages. */
export const FAMILY_WEB_ORIGIN = 'https://family.ayatalbayan.com';

/** The public routes of the legal pages (outside the signed-in family layout). */
export const LEGAL_PATHS: Readonly<Record<LegalPage, string>> = {
  privacy: '/privacy',
  deleteAccount: '/delete-account',
};

/** The day the legal texts (i18n legal.privacy, legal.deletion) last changed: bump it with them. */
export const LEGAL_UPDATED_ON = '2026-11-21';

/** The pages in reading order (the app's rows, the portal's footer). */
export const LEGAL_PAGES: readonly LegalPage[] = ['privacy', 'deleteAccount'];

/** The absolute URL of a legal page, as the app opens it in the browser. */
export const familyLegalUrl = (page: LegalPage): string =>
  `${FAMILY_WEB_ORIGIN}${LEGAL_PATHS[page]}`;
