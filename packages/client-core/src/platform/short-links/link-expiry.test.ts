import { describe, expect, it } from 'vitest';
import { expiryParts, expiryText, SHORT_LINK_PURGE_DAYS } from './link-expiry';

const clock = {
  now: new Date('2026-11-17T11:06:00.000Z'), tz: 'Asia/Riyadh', purgeDays: SHORT_LINK_PURGE_DAYS,
};
const words = {
  today: 'اليوم',
  tomorrow: 'غدًا',
  inDays: { one: 'بعد يوم', two: 'بعد يومين', few: 'بعد {n} أيام', other: 'بعد {n} يومًا' },
  ended: 'انتهى {date} · يُحذف {purge}',
  revoked: 'أُوقف · يُحذف {purge}',
};
const date = (iso: string): string => iso.slice(0, 10);
const text = (status: 'active' | 'expired' | 'revoked', expiresAt: string): string =>
  expiryText(expiryParts({ status, expiresAt }, clock), { words, date });

describe('expiry', () => {
  it('counts calendar days in the viewer zone while it runs', () => {
    expect(text('active', '2026-11-17T20:00:00.000Z')).toBe('اليوم');
    expect(text('active', '2026-11-17T22:00:00.000Z')).toBe('غدًا');
    expect(text('active', '2026-11-19T10:00:00.000Z')).toBe('بعد يومين');
    expect(text('active', '2026-11-20T11:06:00.000Z')).toBe('بعد 3 أيام');
    expect(text('active', '2026-12-30T11:06:00.000Z')).toBe('بعد 43 يومًا');
  });

  it('says when an ended link is deleted', () => {
    expect(SHORT_LINK_PURGE_DAYS).toBe(30);
    expect(text('expired', '2026-11-20T11:06:00.000Z')).toBe('انتهى 2026-11-20 · يُحذف 2026-12-20');
    expect(text('active', '2026-11-10T11:06:00.000Z')).toBe('انتهى 2026-11-10 · يُحذف 2026-12-10');
    expect(text('revoked', '2026-11-20T11:06:00.000Z')).toBe('أُوقف · يُحذف 2026-12-20');
  });

  it('gives the parts', () => {
    const row = { status: 'active', expiresAt: '2026-11-20T11:06:00.000Z' } as const;
    expect(expiryParts(row, clock)).toEqual({
      kind: 'in_days', at: '2026-11-20T11:06:00.000Z', days: 3,
      purgeAt: '2026-12-20T11:06:00.000Z',
    });
  });
});
