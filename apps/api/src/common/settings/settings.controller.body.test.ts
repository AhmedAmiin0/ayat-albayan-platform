import { settingsRoutes } from '@ab/settings';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ZodPipe } from '@/common/http/zod-inputs';

// docs/36 z3: the route's body (the pipe @RouteInput() runs) takes any object; a non-object is the
// same 400 as before (`validation_failed`, one `expected_object` issue).
const bodyPipe = new ZodPipe(settingsRoutes.update.body);
const pipe = (raw: unknown): Promise<unknown> => bodyPipe.transform(raw);

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
