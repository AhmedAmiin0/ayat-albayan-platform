import { describe, expect, it } from 'vitest';
import { sentOnly } from './http';

describe('http helpers (R-TCH-01)', () => {
  it('sentOnly drops defaults the client did not send', () => {
    expect(sentOnly({ rate_60: 120, status: 'active' }, { rate_60: 120 })).toEqual({ rate_60: 120 });
    expect(sentOnly({ status: 'active' }, null)).toEqual({});
  });
});
