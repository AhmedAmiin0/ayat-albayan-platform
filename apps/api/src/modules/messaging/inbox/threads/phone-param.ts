import { normalizePhone } from '@ab/core';
import type { HttpException } from '@nestjs/common';
import { httpError } from '@/common/http/errors';

/** The 400 invalid_phone of a bad `:phone` (`@ZodParam('phone', phoneE164, invalidPhone)`). */
export const invalidPhone = (): HttpException => httpError(400, 'invalid_phone');

/** `:phone` is url-encoded E.164 («%2B9665…»); anything else is 400 invalid_phone. */
export function phoneParam(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone.ok) throw invalidPhone();
  return phone.e164;
}
