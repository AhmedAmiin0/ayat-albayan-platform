import { describe, expect, it } from 'vitest';
import { contactLine } from './academy-contact';

describe('contactLine: how the legal pages reach the academy (settings.academy_contact)', () => {
  it('the email first, as a mailto link', () => {
    const line = contactLine({ site: 'ayatalbayan.com', email: 'help@example.org' });
    expect(line).toEqual({ kind: 'email', text: 'help@example.org', href: 'mailto:help@example.org' });
  });

  it('the site only when the email is missing, empty or null', () => {
    const site = { kind: 'site', text: 'ayatalbayan.com', href: 'https://ayatalbayan.com' };
    expect(contactLine({ site: 'ayatalbayan.com' })).toEqual(site);
    expect(contactLine({ site: 'ayatalbayan.com', email: '' })).toEqual(site);
    expect(contactLine({ site: 'ayatalbayan.com', email: null })).toEqual(site);
  });

  it('a malformed email falls back to the site, never into a mailto link', () => {
    const line = contactLine({ site: 'ayatalbayan.com', email: 'not an email' });
    expect(line?.kind).toBe('site');
  });

  it('a site with a scheme or a path is not trusted as a host', () => {
    expect(contactLine({ site: 'javascript:alert(1)' })).toBeNull();
    expect(contactLine({ site: 'https://ayatalbayan.com/x' })).toBeNull();
  });

  it('nothing usable (empty, null or missing): null, so the page says to use the app', () => {
    expect(contactLine({})).toBeNull();
    expect(contactLine({ site: '', email: '' })).toBeNull();
    expect(contactLine({ site: null, email: null })).toBeNull();
    expect(contactLine(undefined)).toBeNull();
  });

  it('trims surrounding spaces', () => {
    expect(contactLine({ email: ' help@example.org ' })?.text).toBe('help@example.org');
  });
});
