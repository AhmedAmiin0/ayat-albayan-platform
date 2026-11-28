import { normalizePhone } from '@ab/core';
import { BadRequestException, type HttpException } from '@nestjs/common';
import { httpError } from '@/common/http/errors';

/** The 400 invalid_phone of a bad `:phone` (`@ZodParam('phone', phoneE164, invalidPhone)`). */
export const invalidPhone = (): HttpException => httpError(400, 'invalid_phone');

/** ParseUUIDPipe's own 400 for a bad id param, so its clients read the same answer. */
export const invalidUuid = (): HttpException =>
  new BadRequestException('Validation failed (uuid is expected)');

/** `:phone` is url-encoded E.164 («%2B9665…»); anything else is 400 invalid_phone. */
export function phoneParam(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone.ok) throw invalidPhone();
  return phone.e164;
}
