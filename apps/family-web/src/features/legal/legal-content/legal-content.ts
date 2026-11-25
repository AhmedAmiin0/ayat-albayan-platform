import type { LegalPage } from '@ab/client-core';
import { t } from '@ab/web-kit';
import type { LegalContent, LegalPart, LegalSectionView } from './legal-content.types';

/** A link under a legal page (the other page, sign-in). */
export const FOOTER_LINK_CLASS = 'font-semibold text-accent underline-offset-4 hover:underline';

/** Sections whose points are steps to follow in order. */
const ORDERED: ReadonlySet<string> = new Set(['steps']);
/** The section that ends with the academy's contact link. */
const CONTACT = 'contact';

/** The i18n sections of a page, in the bundle's order, ready to render. */
export const sectionViews = (sections: Readonly<Record<string, LegalPart>>): LegalSectionView[] =>
  Object.entries(sections).map(([id, part]) => ({
    id,
    title: part.title,
    body: part.body,
    items: Object.values(part.items ?? {}),
    note: part.note,
    ordered: ORDERED.has(id),
    withContact: id === CONTACT,
  }));

/** Each page's i18n branch (read when shown, so the chosen language and overrides apply). */
const BRANCH: Readonly<Record<LegalPage, () => typeof t.legal.privacy | typeof t.legal.deletion>> =
  {
    privacy: () => t.legal.privacy,
    deleteAccount: () => t.legal.deletion,
  };

/** A legal page's title, intro and sections. */
export function legalContent(page: LegalPage): LegalContent {
  const branch = BRANCH[page]();
  return { title: branch.title, intro: branch.intro, sections: sectionViews(branch.sections) };
}
