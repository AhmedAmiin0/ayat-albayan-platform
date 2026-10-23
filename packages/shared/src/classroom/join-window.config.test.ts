import { describe, expect, it } from 'vitest';
import { makeupOffer } from '../lessons/makeup-offer.js';
import type { LessonView } from '../lessons/views.js';
import { makeupEligible } from '../schemas/booking-extras.js';
import { SETTING_DEFAULTS } from '../settings/registry.js';
import { canJoinNow, DEFAULT_JOIN_WINDOW, joinWindow, joinWindowConfig, roomClosesAt } from './join-window.js';
import { pickStudentLesson } from './student-lesson.js';

const lesson = { starts_at: '2026-10-05T16:00:00Z', ends_at: '2026-10-05T16:30:00Z' };
const at = (iso: string) => new Date(iso);

describe('joinWindow with the settings (join_opens_before_min / join_closes_after_min)', () => {
  it('defaults are the registry values: 15 before, 120 after', () => {
    expect(DEFAULT_JOIN_WINDOW).toEqual({ opensBeforeMin: 15, closesAfterMin: 120 });
    expect(joinWindow(lesson, at('2026-10-05T15:45:00Z')).state).toBe('open');
  });

  it('joinWindowConfig reads the two settings; the defaults give DEFAULT_JOIN_WINDOW', () => {
    expect(joinWindowConfig({ join_opens_before_min: 5, join_closes_after_min: 30 })).toEqual({ opensBeforeMin: 5, closesAfterMin: 30 });
    expect(joinWindowConfig(SETTING_DEFAULTS)).toEqual(DEFAULT_JOIN_WINDOW);
  });

  it('a changed window changes when the room opens and closes', () => {
    const win = { opensBeforeMin: 5, closesAfterMin: 10 };
    expect(joinWindow(lesson, at('2026-10-05T15:45:00Z'), win).state).toBe('early');
    expect(joinWindow(lesson, at('2026-10-05T15:55:00Z'), win).state).toBe('open');
    expect(canJoinNow(lesson, at('2026-10-05T16:41:00Z'), win)).toBe(false);
    expect(roomClosesAt(lesson, win)).toBe('2026-10-05T16:40:00.000Z');
    expect(roomClosesAt(lesson)).toBe('2026-10-05T18:30:00.000Z');
  });

  it('pickStudentLesson drops a lesson whose shorter tail has closed', () => {
    const now = at('2026-10-05T17:00:00Z');
    expect(pickStudentLesson([lesson], now)).toBe(lesson);
    expect(pickStudentLesson([lesson], now, { opensBeforeMin: 15, closesAfterMin: 10 })).toBeNull();
  });
});

describe('makeup window (settings.makeup_window_days)', () => {
  const missed = { status: 'no_show' as const, chargeable: true, trial: false, makeup: false, startsAt: '2026-08-01T10:00:00Z' };
  const now = at('2026-10-05T10:00:00Z'); // 65 days later

  it('60 days by default; a longer window lets the same miss be made up', () => {
    expect(makeupEligible(missed, now)).toBe('too_old');
    expect(makeupEligible(missed, now, 90)).toBe('ok');
  });

  it('makeupOffer follows the window too', () => {
    const view = {
      status: 'no_show', trial: false, makeup: false, starts_at: missed.startsAt,
      students: [{ id: 's1', chargeable: true, makeup: null }],
    } as unknown as LessonView;
    expect(makeupOffer(view, now).open).toHaveLength(0);
    expect(makeupOffer(view, now, 90).open).toHaveLength(1);
  });
});
