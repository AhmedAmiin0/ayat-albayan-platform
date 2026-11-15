import { pathKey } from '@ab/client-core';
import { describe, expect, it, vi } from 'vitest';
import { meQuery } from './me';

vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: {} } }));

describe('meQuery key (E1: one key convention)', () => {
  it('is the old literal key, so every existing invalidation still matches', () => {
    expect(meQuery.queryKey).toEqual(['auth', 'me']);
  });

  it('is the key mobile uses for GET /auth/me', () => {
    expect(meQuery.queryKey).toEqual(pathKey('/auth/me'));
  });
});
