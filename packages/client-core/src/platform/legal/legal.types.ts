/** A page of the family portal's public legal section (no sign-in needed). */
export type LegalPage = 'privacy' | 'deleteAccount';

/** The academy's settings.academy_contact as the public config carries it. */
export interface AcademyContact {
  site?: string | null;
  email?: string | null;
}

/** How a page reaches the academy: its email, else its site; `href` opens it. */
export interface ContactLine {
  kind: 'email' | 'site';
  text: string;
  href: string;
}
