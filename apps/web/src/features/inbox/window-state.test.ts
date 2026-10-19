import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { leftText, windowLeftMs, windowText } from './window-state';

const NOW = new Date('2026-10-05T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const H = 3_600_000;

describe('the 24 h window in words', () => {
  it('time left: 24 h after their last message, never negative', () => {
    expect(windowLeftMs(ago(H), NOW)).toBe(23 * H);
    expect(windowLeftMs(ago(25 * H), NOW)).toBe(0);
    expect(windowLeftMs(null, NOW)).toBe(0);
  });

  it.each([
    [23 * H + 59 * 60_000, '23س'],
    [H, '1س'],
    [59 * 60_000 + 1, '60د'],
    [30_000, '1د'],
  ])('%i ms → «%s»', (ms, text) => {
    expect(leftText(ms)).toBe(text);
  });

  it('open with what is left, else closed with how to reopen it', () => {
    expect(windowText(ago(2 * H), NOW)).toEqual({ open: true, text: 'المحادثة مفتوحة — تبقّى 22س' });
    expect(windowText(ago(24 * H), NOW)).toEqual({ open: false, text: t.inbox.window.closed });
    expect(windowText(null, NOW).open).toBe(false);
  });
});

describe('the closed window for teacher and sales (W7)', () => {
  it.each(['sales', 'teacher'] as const)('%s: what reopens it, never «تقييم» (the rating is the admin’s)', (mode) => {
    const { open, text } = windowText(ago(25 * H), NOW, mode);
    expect(open).toBe(false);
    expect(text).toBe(t.inbox.window.closedStaff);
    expect(text).not.toContain('تقييم');
  });

  it('admin: unchanged, also when passed explicitly', () => {
    expect(windowText(ago(25 * H), NOW, 'admin')).toEqual({ open: false, text: t.inbox.window.closed });
    expect(t.inbox.window.closed).toContain('تقييم');
  });

  it('an open window reads the same in every mode', () => {
    expect(windowText(ago(2 * H), NOW, 'sales')).toEqual(windowText(ago(2 * H), NOW, 'admin'));
  });
});
