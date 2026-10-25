import { normalizePhone } from '@ab/shared';
import { waHttpError } from '../whatsapp/templates/catalog/template.mapper';

/** `:phone` is url-encoded E.164 («%2B9665…»); anything else is 400 invalid_phone. */
export function phoneParam(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone.ok) throw waHttpError('invalid_phone', 400);
  return phone.e164;
}
