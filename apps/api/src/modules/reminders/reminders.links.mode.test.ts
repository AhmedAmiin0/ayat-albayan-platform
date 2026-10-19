import { DEFAULT_JOIN_WINDOW } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { at, sampleLesson } from './reminders.fakes';
import { joinCandidates, platformLesson, roomFor, sentLinks, type RoomContext } from './reminders.links';

// teachers.meeting_mode (migration 490, owner 2026-10-19): the lesson's teacher decides, the academy
// switch (ctx.auto) only for a teacher who follows it. Invented data (reminders.fakes).

const ORIGIN = 'https://app.example';
const OFF: RoomContext = { auto: false, livekit: true, joinOk: true, origin: ORIGIN };
const ON: RoomContext = { ...OFF, auto: true };
const DUE = { now: at('2026-10-04T13:10:00Z'), minutesBefore: 60, win: DEFAULT_JOIN_WINDOW };
const FIXED = 'https://meet.jit.si/ab-room-7';

const teacher = (id: string, meeting_mode: string | null) => ({ id, display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'Asia/Riyadh', meeting_mode });
const platform = sampleLesson({ id: 'lesson-p', teacher: teacher('t-p', 'platform') });
const fixed = sampleLesson({ id: 'lesson-s', teacher: teacher('t-s', 'static') });
const academy = sampleLesson({ id: 'lesson-a', teacher: teacher('t-a', null) });

const links = (ctx: RoomContext) => Object.fromEntries(sentLinks([platform, fixed, academy], ctx).map((l) => [l.id, l.meeting_link]));
const familyLessons = (ctx: RoomContext) => [...new Set(joinCandidates([platform, fixed, academy], ctx, DUE).map((c) => c.lessonId))];

describe('per-teacher meeting mode', () => {
  it('academy OFF: the platform teacher gets our classroom, the static and default teachers their fixed link', () => {
    expect(links(OFF)).toEqual({ 'lesson-p': `${ORIGIN}/classroom/lesson-p`, 'lesson-s': FIXED, 'lesson-a': FIXED });
    expect(familyLessons(OFF)).toEqual(['lesson-p']);
  });

  it('academy ON: a static teacher keeps the fixed link; the platform and default teachers get the classroom', () => {
    expect(links(ON)).toEqual({ 'lesson-p': `${ORIGIN}/classroom/lesson-p`, 'lesson-s': FIXED, 'lesson-a': `${ORIGIN}/classroom/lesson-a` });
    expect(familyLessons(ON)).toEqual(['lesson-p', 'lesson-a']);
  });

  it('a platform teacher without LiveKit: no link at all, never the fixed one', () => {
    const ctx = { ...OFF, livekit: false };
    expect(roomFor(platform, ctx)).toBe(false);
    expect(links(ctx)['lesson-p']).toBeNull();
    expect(links(ctx)['lesson-s']).toBe(FIXED);
  });

  it('a static teacher under academy ON: our room only for a lesson without a link, once lesson_join_link is approved', () => {
    const bare = { ...fixed, meeting_link: null };
    expect(roomFor(bare, ON)).toBe(true);
    expect(roomFor(bare, { ...ON, joinOk: false })).toBe(false);
    expect(sentLinks([bare], { ...ON, joinOk: false })[0]?.meeting_link).toBeNull();
  });

  it('a lesson without a teacher (or an unknown mode) follows the academy switch', () => {
    expect(platformLesson({ teacher: null }, ON)).toBe(true);
    expect(platformLesson({ teacher: null }, OFF)).toBe(false);
    expect(platformLesson({ teacher: teacher('t-x', 'zoom') }, ON)).toBe(true);
  });
});
