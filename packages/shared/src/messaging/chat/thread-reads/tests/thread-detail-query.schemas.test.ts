import { describe, expect, it } from 'vitest';
import { PENDING_IDS_MAX } from '../../../thread-delta';
import { threadDetailQuerySchema as query } from '../thread-detail-query.schemas';

const AT = '2026-10-27T10:00:00.000Z';
const ID = 'c0000000-0000-4000-8000-0000000000a1';
const uuid = (i: number) => `c0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

describe('threadDetailQuerySchema: a page', () => {
  it('reads the newest page with the default size', () => {
    expect(query.parse({})).toEqual({ mode: 'page', limit: 50 });
  });

  it('reads an older page by the compound keyset and the window around a message', () => {
    expect(query.parse({ before: AT, before_id: ID, limit: '20' })).toEqual({
      mode: 'page',
      before: AT,
      before_id: ID,
      limit: 20,
    });
    expect(query.parse({ around: ID })).toEqual({ mode: 'page', around: ID, limit: 50 });
  });

  it('drops a pending list that comes without after', () => {
    expect(query.parse({ pending: 'x' })).toEqual({ mode: 'page', limit: 50 });
  });

  it('refuses a broken page mode and a size out of range', () => {
    expect(query.safeParse({ before_id: ID }).success).toBe(false);
    expect(query.safeParse({ around: ID, before: AT }).success).toBe(false);
    expect(query.safeParse({ limit: '0' }).success).toBe(false);
    expect(query.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('threadDetailQuerySchema: a delta', () => {
  it('reads what changed after an instant, with the rows still moving', () => {
    expect(query.parse({ after: AT, pending: `${ID},,${uuid(2)}` })).toEqual({
      mode: 'delta',
      after: AT,
      pending: [ID, uuid(2)],
      limit: 50,
    });
  });

  it('drops a before beside after, as the page keyset never mixes with a delta', () => {
    expect(query.parse({ after: AT, before: AT })).toEqual({
      mode: 'delta',
      after: AT,
      pending: [],
      limit: 50,
    });
  });

  it('refuses a bad after, a pending id that is no uuid, too many ids and a window', () => {
    expect(query.safeParse({ after: 'yesterday' }).success).toBe(false);
    expect(query.safeParse({ after: AT, pending: '1,2' }).success).toBe(false);
    const many = Array.from({ length: PENDING_IDS_MAX + 1 }, (_, i) => uuid(i)).join(',');
    expect(query.safeParse({ after: AT, pending: many }).success).toBe(false);
    expect(query.safeParse({ after: AT, around: ID }).success).toBe(false);
  });
});
