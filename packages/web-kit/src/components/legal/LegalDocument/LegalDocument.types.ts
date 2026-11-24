import type { ReactNode } from 'react';

export interface LegalDocumentProps {
  title: string;
  /** The «last updated» line, already worded. */
  updated: string;
  /** The page's sections (LegalSection). */
  children: ReactNode;
  /** Links under the page (the other legal page, sign-in, the language). */
  footer?: ReactNode;
}
