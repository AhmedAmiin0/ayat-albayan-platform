import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { publicProblem, toFormView } from './api';

describe('public feedback contract', () => {
  it('toFormView reads the camelCase answer and nothing else', () => {
    expect(
      toFormView({ teacherName: 'أبرار', kind: 'trial', contactPhone: '+2010', alreadySubmitted: true, extra: 1 }),
    ).toEqual({ teacherName: 'أبرار', kind: 'trial', contactPhone: '+2010', alreadySubmitted: true });
    expect(toFormView({ teacherName: 'x', kind: 'subscription' })).toMatchObject({ contactPhone: '', alreadySubmitted: false });
  });

  it('toFormView refuses an answer it does not understand', () => {
    expect(() => toFormView({ teacherName: 'x', kind: 'other' })).toThrow(ApiError);
    expect(() => toFormView(null)).toThrow(ApiError);
  });

  it('publicProblem: 409 already, 429 too many, other 4xx a bad link, the rest a failure to retry', () => {
    expect(publicProblem(new ApiError(409))).toBe('already');
    expect(publicProblem(new ApiError(429))).toBe('too_many');
    expect(publicProblem(new ApiError(404))).toBe('invalid');
    expect(publicProblem(new ApiError(401))).toBe('invalid');
    expect(publicProblem(new ApiError(500))).toBe('failed');
    expect(publicProblem(new TypeError('network'))).toBe('failed');
  });
});
