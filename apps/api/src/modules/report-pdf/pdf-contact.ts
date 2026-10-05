import { formatPhone, type AcademySettings } from '@ab/shared';
import type { PdfContact } from './pdf-model';

/**
 * The report footer's contact: the site from settings.academy_contact (none keeps the built-in
 * one) and the number from settings.academy_whatsapp_e164, the single source of the academy's
 * WhatsApp.
 */
export function pdfContact(s: Pick<AcademySettings, 'academy_contact' | 'academy_whatsapp_e164'>): PdfContact {
  const { site } = s.academy_contact;
  return { ...(site ? { site } : {}), whatsapp: formatPhone(s.academy_whatsapp_e164) };
}
