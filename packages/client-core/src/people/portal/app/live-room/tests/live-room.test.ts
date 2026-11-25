import { describe, expect, it } from 'vitest';
import { liveRoom, liveRoomText, type LiveRoomWords } from '../live-room';

const now = new Date('2026-11-16T15:34:00Z');
const teacher = { name: 'فاطمة', role: 'teacher' as const };
const staff = { name: 'مريم', role: 'staff' as const };
const room = (over = {}) => ({
  liveSince: '2026-11-16T15:30:00Z',
  endedAt: null,
  inRoom: [teacher, staff],
  ...over,
});

const words: LiveRoomWords = {
  justNow: 'بدأت الآن',
  since: { one: 'دقيقة', two: 'دقيقتان', few: '{n} دقائق', other: '{n} دقيقة' },
  teacherIn: 'المعلم في الغرفة',
  othersIn: 'في الغرفة',
  roles: {
    teacher: '{name}',
    student: '{name}',
    guardian: '{name}',
    staff: '{name} (مساعد حلقة)',
    guest: '{name} (ضيف)',
  },
  unnamed: {
    teacher: 'المعلم/ة',
    student: 'طالب',
    guardian: 'ولي أمر',
    staff: 'مساعد حلقة',
    guest: 'ضيف',
  },
  row: 'جارية الآن',
  rowTeacher: 'جارية الآن · المعلم في الغرفة',
};

describe('liveRoom', () => {
  it('live while someone is inside: minutes since the first arrival, the teacher in', () => {
    expect(liveRoom({ room: room() }, now)).toEqual({
      minutes: 4,
      teacherIn: true,
      people: [teacher, staff],
    });
  });

  it('never live: nobody inside, ended for everyone, or no room on the payload', () => {
    expect(liveRoom({ room: room({ liveSince: null, inRoom: [] }) }, now)).toBeNull();
    expect(liveRoom({ room: room({ endedAt: '2026-11-16T15:33:00Z' }) }, now)).toBeNull();
    expect(liveRoom({ room: null }, now)).toBeNull();
    expect(liveRoom({}, now)).toBeNull();
  });

  it('a clock running behind the server reads as just started', () => {
    expect(liveRoom({ room: room({ liveSince: '2026-11-16T15:35:00Z' }) }, now)?.minutes).toBe(0);
  });
});

describe('liveRoomText', () => {
  it('how long, the teacher line and the names with their role', () => {
    const live = { minutes: 4, teacherIn: true, people: [teacher, staff] };
    expect(liveRoomText(live, words)).toEqual({
      since: '4 دقائق',
      title: 'المعلم في الغرفة',
      who: 'فاطمة · مريم (مساعد حلقة)',
      faces: ['فاطمة', 'مريم'],
      row: 'جارية الآن · المعلم في الغرفة',
    });
  });

  it('just started, only the student inside', () => {
    const people = [{ name: 'يوسف', role: 'student' as const }];
    const live = { minutes: 0, teacherIn: false, people };
    expect(liveRoomText(live, words)).toMatchObject({
      since: 'بدأت الآن',
      title: 'في الغرفة',
      who: 'يوسف',
      row: 'جارية الآن',
    });
  });
});

describe('a person named by role only (privacy)', () => {
  it('reads the role word, never a stray comma, and the face takes it too', () => {
    const people = [teacher, { role: 'guest' as const }, { role: 'staff' as const }];
    const text = liveRoomText({ minutes: 2, teacherIn: true, people }, words);
    expect(text.who).toBe('فاطمة · ضيف · مساعد حلقة');
    expect(text.faces).toEqual(['فاطمة', 'ضيف', 'مساعد حلقة']);
  });
});
