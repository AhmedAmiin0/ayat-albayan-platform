import { guardianCreateBodySchema as createBody } from '@ab/shared';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseOrThrow } from '@/common/http/http';

describe('the guardian create body (parseOrThrow + blanksToNull)', () => {
  it('returns the parsed value; phones come out E.164 (R-STU-02)', () => {
    const dto = parseOrThrow(createBody, {
      name: 'ام جود',
      phone_e164: '0501234567',
      tz: 'Asia/Riyadh',
    });
    expect(dto.phone_e164).toBe('+966501234567');
  });

  it('throws 400 validation_failed with the issue path and reason', () => {
    try {
      parseOrThrow(createBody, { name: 'x', phone_e164: '@handle', tz: 'Asia/Riyadh' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toEqual({
        message: 'validation_failed',
        issues: [{ path: 'phone_e164', message: 'not_a_number' }],
      });
    }
  });
});
