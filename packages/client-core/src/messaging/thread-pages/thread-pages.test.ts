import { describe, expect, it, vi } from 'vitest';
import type { ThreadDetail } from '@ab/shared';
import {
  anchoredThreadKey,
  anchoredThreadPages,
  anchoredThreadPrefix,
  jumpPlan,
  threadNextParam,
  threadPageQuery,
  windowEnd,
} from './thread-pages.js';

const ID = 'b1111111-1111-4111-8111-111111111111';
const AT = '2026-10-01T09:30:00.123456+00:00';
const row = (id: string, created_at: string) => ({ id, created_at });

describe('threadPageQuery', () => {
  it('newest, compound keyset, around and a legacy persisted string', () => {
    expect(threadPageQuery(null)).toBe('');
    expect(threadPageQuery(undefined)).toBe('');
    expect(threadPageQuery('')).toBe('');
    expect(threadPageQuery({ before: AT, before_id: ID })).toBe(
      `?before=${encodeURIComponent(AT)}&before_id=${ID}`,
    );
    expect(threadPageQuery({ around: ID })).toBe(`?around=${ID}`);
    expect(threadPageQuery(AT)).toBe(`?before=${encodeURIComponent(AT)}`);
  });
});

describe('threadNextParam', () => {
  it('keys the older page by the oldest row (time and id); none at the start', () => {
    const messages = [row('a', AT), row('b', '2026-10-02T00:00:00Z')];
    const page = (has_more: boolean, rows: typeof messages) =>
      ({ has_more, messages: rows }) as unknown as ThreadDetail;
    expect(threadNextParam(page(true, messages))).toEqual({ before: AT, before_id: 'a' });
    expect(threadNextParam(page(false, messages))).toBeUndefined();
    expect(threadNextParam(page(true, []))).toBeUndefined();
  });
});

describe('anchoredThreadPages', () => {
  it('opens around the id, pages back by keyset and never refetches by itself', async () => {
    const detail = { has_more: true, messages: [row('a', AT)] } as unknown as ThreadDetail;
    const get = vi.fn().mockResolvedValue(detail);
    const o = anchoredThreadPages('+966500000001', ID, get);
    expect(o.initialPageParam).toEqual({ around: ID });
    await o.queryFn({ pageParam: o.initialPageParam });
    expect(get).toHaveBeenCalledWith(`/threads/%2B966500000001?around=${ID}`);
    expect(o.getNextPageParam(detail)).toEqual({ before: AT, before_id: 'a' });
    expect(o.staleTime).toBe(Number.POSITIVE_INFINITY);
  });

  it('its key is outside the live chat keys (web and mobile) but under its own prefix', () => {
    const key = anchoredThreadKey('+1', ID);
    expect(key.slice(0, 1)).not.toEqual(['threads']);
    expect(key.slice(0, 2)).toEqual([...anchoredThreadPrefix('+1')]);
  });
});

describe('jumpPlan / windowEnd', () => {
  it('scrolls to a shown hit, anchors any other', () => {
    expect(jumpPlan('a', ['a', 'b'])).toBe('scroll');
    expect(jumpPlan('z', new Set(['a']))).toBe('anchor');
  });

  it('the window ends at its newest row; null without rows', () => {
    expect(windowEnd([row('a', AT), row('b', '2026-10-02T00:00:00Z')])).toBe('2026-10-02T00:00:00Z');
    expect(windowEnd([])).toBeNull();
  });
});
