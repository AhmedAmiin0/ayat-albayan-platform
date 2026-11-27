import { LEGAL_PAGES, type LegalPage } from '@ab/client-core';

export const otherLegalPages = (current: LegalPage): LegalPage[] =>
  LEGAL_PAGES.filter((page) => page !== current);
