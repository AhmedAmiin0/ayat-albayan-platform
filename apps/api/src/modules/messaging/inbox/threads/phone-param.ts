import { normalizePhone } from '@ab/shared';
import type { HttpException } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';

/** The 400 invalid_phone of a bad `:phone` (`@ZodParam('phone', phoneE164, invalidPhone)`). */
export const invalidPhone = (): HttpException => waHttpError('invalid_phone', 400);

/** `:phone` is url-encoded E.164 («%2B9665…»); anything else is 400 invalid_phone. */
export function phoneParam(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone.ok) throw invalidPhone();
  return phone.e164;
}
