import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { bodyPipeOf } from '@/common/http/zod-inputs.test-util';
import { SettingsController } from './settings.controller';

// docs/36 z3: the PATCH /settings body is parsed by `settingsPatchBodySchema` (@ZodBody) before
// the handler; a non-object is the same 400 as before (`validation_failed`, one
// `expected_object` issue).
const pipe = bodyPipeOf(SettingsController, 'update');

const rejection = async (raw: unknown): Promise<unknown> => {
  try {
    await pipe(raw);
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return (e as BadRequestException).getResponse();
  }
  throw new Error('expected a 400');
};

describe('PATCH /settings — body pipe', () => {
  it.each([null, undefined, [], [1], 'x', 3, true])('%j → 400 expected_object', async (raw) => {
    expect(await rejection(raw)).toEqual({
      message: 'validation_failed',
      issues: [{ path: '', message: 'expected_object' }],
    });
  });

  it('an object passes through unchanged (fields are checked one by one later)', async () => {
    const body = { lateCancelHours: 'nope', unknownField: 1, bookingHorizonWeeks: 6 };
    expect(await pipe(body)).toEqual(body);
  });

  it('an empty object passes (the handler answers saved: [])', async () => {
    expect(await pipe({})).toEqual({});
  });
});
