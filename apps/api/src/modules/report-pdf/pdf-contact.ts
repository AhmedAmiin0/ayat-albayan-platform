import { formatPhone, type AcademySettings } from '@ab/shared';
import type { PdfContact } from './pdf-model';

/**
 * The report footer's contact from settings.academy_contact. A missing number falls back to
 * settings.academy_whatsapp_e164; a field with neither keeps the built-in CONTACT in the template.
 */
export function pdfContact(s: Pick<AcademySettings, 'academy_contact' | 'academy_whatsapp_e164'>): PdfContact {
  const { site, whatsapp } = s.academy_contact;
  const number = whatsapp ?? s.academy_whatsapp_e164;
  return { ...(site ? { site } : {}), ...(number ? { whatsapp: formatPhone(number) } : {}) };
}
