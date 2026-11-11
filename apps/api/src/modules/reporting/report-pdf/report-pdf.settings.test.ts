import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { pdfContact } from './render/pdf-contact';
import { ReportPdfSettings } from './report-pdf.settings';

/** The footer's contact keys and the edit window (docs/46 B3): the reader lists exactly these. */
const BEFORE = ['academy_contact', 'academy_whatsapp_e164', 'report_teacher_edit_minutes'] as const;

describe('ReportPdfSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(ReportPdfSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored contact, which is all the footer needs', async () => {
    const over = { academy_contact: { site: 'example.org' }, academy_whatsapp_e164: '+201001234567' };
    const values = await readerOf(ReportPdfSettings, over).read();
    expect(values).toEqual({ ...over, report_teacher_edit_minutes: 30 });
    expect(pdfContact(values)).toEqual(pdfContact({ ...SETTING_DEFAULTS, ...over }));
  });
});
