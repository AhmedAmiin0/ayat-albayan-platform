import type { ReactNode } from 'react';

export interface LegalDocumentProps {
  /** The page's one level-1 heading («سياسة الخصوصية»). */
  title: string;
  /** The «last updated» line, already worded. */
  updated: string;
  /** The page's sections (LegalSection). */
  children: ReactNode;
  /** Links under the page (the other legal page, sign-in, the language). */
  footer?: ReactNode;
}
