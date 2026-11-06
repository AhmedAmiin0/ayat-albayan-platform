import { describe, expect, it } from 'vitest';
import { onePageMode } from './page-mode';

const AT = '2026-10-22T10:00:00.000Z';
const ID = 'b1111111-1111-4111-8111-111111111111';

describe('onePageMode', () => {
  it('accepts the newest page, before, before + before_id and around alone', () => {
    expect(onePageMode({})).toEqual([]);
    expect(onePageMode({ before: AT })).toEqual([]);
    expect(onePageMode({ before: AT, before_id: ID })).toEqual([]);
    expect(onePageMode({ around: ID })).toEqual([]);
  });

  it('refuses before_id without before and around beside before, before_id or after', () => {
    expect(onePageMode({ before_id: ID })).toEqual(['before_id_needs_before']);
    expect(onePageMode({ around: ID, before: AT })).toEqual(['around_excludes_before']);
    expect(onePageMode({ around: ID, before_id: ID })).toEqual(['before_id_needs_before']);
    expect(onePageMode({ around: ID, after: AT })).toEqual(['around_excludes_after']);
  });
});
