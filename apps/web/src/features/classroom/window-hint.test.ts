import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { joinHint, opensAtText } from './window-hint';

const LESSON = { starts_at: '2026-10-03T16:00:00.000Z', ends_at: '2026-10-03T17:00:00.000Z' };
const at = (iso: string) => new Date(iso);

describe('joinHint', () => {
  it('is closed with «بتفتح الساعة» before the 15-minute window, in Western digits', () => {
    const h = joinHint(LESSON, at('2026-10-03T15:30:00.000Z'));
    expect(h.canJoin).toBe(false);
    expect(h.hint).toBe(opensAtText('2026-10-03T15:45:00.000Z'));
    expect(h.hint).toMatch(/\d{2}:\d{2}/);
    expect(h.hint?.startsWith(t.classroom.opensAt.split('{')[0] as string)).toBe(true);
  });

  it('opens exactly 15 minutes before the start', () => {
    expect(joinHint(LESSON, at('2026-10-03T15:44:59.000Z')).canJoin).toBe(false);
    expect(joinHint(LESSON, at('2026-10-03T15:45:00.000Z')).canJoin).toBe(true);
    expect(joinHint(LESSON, at('2026-10-03T15:45:00.000Z')).hint).toBeNull();
  });

  it('stays open until 2 hours after the end, then says the lesson is over', () => {
    expect(joinHint(LESSON, at('2026-10-03T19:00:00.000Z')).canJoin).toBe(true);
    const late = joinHint(LESSON, at('2026-10-03T19:00:01.000Z'));
    expect(late).toEqual({ canJoin: false, hint: t.classroom.closedHint });
  });

  it('follows the window from the settings (join_opens_before_min / join_closes_after_min)', () => {
    const win = { opensBeforeMin: 30, closesAfterMin: 10 };
    expect(joinHint(LESSON, at('2026-10-03T15:30:00.000Z'), win).canJoin).toBe(true);
    expect(joinHint(LESSON, at('2026-10-03T19:00:00.000Z'), win).canJoin).toBe(false);
  });
});
