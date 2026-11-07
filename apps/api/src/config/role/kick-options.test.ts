import { describe, expect, it } from 'vitest';
import { kickOptionsOf, kickOptionsOfQuery, kickQueryOf, kickQuerySchema } from './kick-options';

describe('kick options (docs/42 42-7, 42-8)', () => {
  it('round-trips through the route query', () => {
    expect(kickQueryOf({ lane: 'chat', wait: true })).toEqual({ lane: 'chat', wait: '1' });
    expect(kickOptionsOfQuery({ lane: 'chat', wait: '1' })).toEqual({ lane: 'chat', wait: true });
    expect(kickQueryOf({})).toEqual({ lane: undefined, wait: '0' });
    expect(kickOptionsOfQuery({ wait: '0' })).toEqual({ wait: false });
  });

  it('no `wait` (an API copy from before 42-8, rolling deploy) waits; a malformed one is refused', () => {
    expect(kickOptionsOfQuery({})).toEqual({ wait: true });
    expect(kickOptionsOfQuery({ lane: 'chat' })).toEqual({ lane: 'chat', wait: true });
    expect(kickQuerySchema.safeParse({ lane: 'Chat; DROP', wait: 'yes' }).success).toBe(false);
  });

  it('caller options: a bad shape is no options', () => {
    expect(kickOptionsOf(undefined)).toEqual({});
    expect(kickOptionsOf({ lane: 'chat' })).toEqual({ lane: 'chat' });
    expect(kickOptionsOf({ lane: 7 })).toEqual({});
  });
});
