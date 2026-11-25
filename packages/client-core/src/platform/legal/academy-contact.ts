import { z } from 'zod';
import type { AcademyContact, ContactLine } from './legal.types';

/** A bare host name («ayatalbayan.com»): no scheme, no path, so it never becomes a script link. */
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const email = z.string().trim().pipe(z.email());
const site = z.string().trim().regex(HOST);

const asEmail = (value: string): ContactLine => ({
  kind: 'email',
  text: value,
  href: `mailto:${value}`,
});
const asSite = (value: string): ContactLine => ({
  kind: 'site',
  text: value,
  href: `https://${value}`,
});

/**
 * How the legal pages reach the academy, from settings.academy_contact: its email (a mailto
 * link), else its site; null when neither is usable.
 */
export function contactLine(contact: AcademyContact | undefined): ContactLine | null {
  const byEmail = email.safeParse(contact?.email);
  const bySite = site.safeParse(contact?.site);
  return (
    (byEmail.success ? asEmail(byEmail.data) : null) ??
    (bySite.success ? asSite(bySite.data) : null)
  );
}
