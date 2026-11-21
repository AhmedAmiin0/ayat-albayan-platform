/** One section of a legal page as the i18n bundle holds it (legal.privacy.sections.*). */
export interface LegalPart {
  title: string;
  body?: string;
  items?: Readonly<Record<string, string>>;
  note?: string;
}

/** A section ready to render. */
export interface LegalSectionView {
  id: string;
  title: string;
  body?: string;
  items: string[];
  note?: string;
  /** Numbered steps (the deletion request). */
  ordered: boolean;
  /** Ends with the academy's contact link (settings.academy_contact). */
  withContact: boolean;
}

/** A legal page's words: its title, its opening paragraph, its sections in order. */
export interface LegalContent {
  title: string;
  intro: string;
  sections: LegalSectionView[];
}
