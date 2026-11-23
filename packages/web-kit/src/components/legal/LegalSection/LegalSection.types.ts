import type { ReactNode } from 'react';

export interface LegalSectionProps {
  /** Unique on the page: the heading's id is `legal-<id>`, for aria-labelledby and anchors. */
  id: string;
  title: string;
  /** The opening paragraph. */
  body?: string;
  /** Points under it, in order. */
  items?: readonly string[];
  /** Numbered steps instead of bullets. */
  ordered?: boolean;
  /** After the text: a contact link, a note. */
  children?: ReactNode;
}
