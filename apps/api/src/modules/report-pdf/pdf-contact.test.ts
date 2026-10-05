import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { pdfContact } from './pdf-contact';
import { sampleModel } from './report-pdf.fakes';
import { footerHtml } from './template.body';

const settings = (contact: Record<string, string>, whatsapp = '+966566101447') => ({ academy_contact: contact, academy_whatsapp_e164: whatsapp });

describe('pdfContact (settings.academy_contact → the report footer)', () => {
  it('the default settings print exactly the old built-in line', () => {
    const contact = pdfContact(SETTING_DEFAULTS);
    expect(contact).toEqual({ site: 'ayatalbayan.com', whatsapp: '+966 56 610 1447' });
    expect(footerHtml({ ...sampleModel(), contact })).toBe(footerHtml(sampleModel()));
  });

  it('a configured site and number replace the built-in ones', () => {
    const html = footerHtml({ ...sampleModel(), contact: pdfContact(settings({ site: 'example.org', whatsapp: '+201001234567' })) });
    expect(html).toContain('example.org');
    expect(html).toContain('+20 10 0123 4567');
    expect(html).not.toContain('ayatalbayan.com');
  });

  it('a contact without a number uses the academy WhatsApp setting; without a site, the built-in one', () => {
    const contact = pdfContact(settings({ email: 'a@b.co' }, '+201001234567'));
    expect(contact).toEqual({ whatsapp: '+20 10 0123 4567' });
    const html = footerHtml({ ...sampleModel(), contact });
    expect(html).toContain('ayatalbayan.com');
    expect(html).toContain('+20 10 0123 4567');
  });

  it('no contact at all changes nothing', () => {
    expect(footerHtml({ ...sampleModel(), contact: undefined })).toBe(footerHtml(sampleModel()));
  });
});
