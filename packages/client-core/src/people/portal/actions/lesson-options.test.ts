import type { PortalLesson } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  confirmedLine, declineLine, excusedLine, lessonOptions, requestChip,
} from './lesson-options';

const NOW = new Date('2026-11-16T10:00:00Z');
const request = (status: 'pending' | 'rejected') => ({
  id: 'r1', status, proposed_starts_at: '2026-11-18T14:30:00.000Z', note: null, decision_note: null, decided_at: null,
});
const lesson = (over: Partial<PortalLesson> = {}): PortalLesson => ({
  id: 'l1',
  starts_at: '2026-11-17T15:30:00.000Z',
  ends_at: '2026-11-17T16:15:00.000Z',
  status: 'scheduled',
  teacher: { display_name_ar: 'فاطمة', display_name_en: null },
  way_in: 'classroom',
  meeting_url: null,
  window: { state: 'early', opens_at: '2026-11-17T15:15:00.000Z', closes_at: '2026-11-17T16:30:00.000Z' },
  family: { group: false, counts: false, request: null },
  ...over,
});

describe('«خيارات الحلقة» (owner 2026-11-17)', () => {
  it('needs confirmation: confirm, ask for another time, excuse', () => {
    expect(lessonOptions(lesson(), NOW)).toEqual(['confirm', 'request', 'decline']);
  });

  it('confirmed: no «سأحضر» again', () => {
    expect(lessonOptions(lesson({ status: 'confirmed' }), NOW)).toEqual(['request', 'decline']);
  });

  it('a request waiting: withdraw it instead of asking again', () => {
    const waiting = lesson({ family: { group: false, counts: false, request: request('pending') } });
    expect(lessonOptions(waiting, NOW)).toEqual(['confirm', 'withdraw', 'decline']);
  });

  it('started, closed or from an older API: nothing', () => {
    expect(lessonOptions(lesson(), new Date('2026-11-17T15:30:00Z'))).toEqual([]);
    expect(lessonOptions(lesson({ status: 'excused' }), NOW)).toEqual([]);
    expect(lessonOptions(lesson({ family: undefined }), NOW)).toEqual([]);
  });

  it('the request chip replaces the status chip while the lesson is open', () => {
    expect(requestChip(lesson({ family: { group: false, counts: false, request: request('pending') } }))).toBe('pendingChip');
    expect(requestChip(lesson({ family: { group: false, counts: false, request: request('rejected') } }))).toBe('rejectedChip');
    expect(requestChip(lesson())).toBeNull();
    const closed = lesson({ status: 'completed', family: { group: false, counts: true, request: request('pending') } });
    expect(requestChip(closed)).toBeNull();
  });

  it('the package lines: the preview, and an excused lesson\'s outcome', () => {
    expect(declineLine(lesson())).toBe('countsNo');
    expect(declineLine(lesson({ family: { group: false, counts: true, request: null } }))).toBe('countsYes');
    expect(excusedLine(lesson({ status: 'excused', family: { group: false, counts: false, request: null } }))).toBe('excusedNo');
    expect(excusedLine(lesson({ status: 'excused', family: { group: false, counts: true, request: null } }))).toBe('excusedYes');
    expect(excusedLine(lesson())).toBeNull();
  });

  it('a group lesson: no options (the academy changes it), no «أكّدتم حضور»', () => {
    const group = lesson({ status: 'confirmed', family: { group: true, counts: false, request: null } });
    expect(lessonOptions(group, NOW)).toEqual([]);
    expect(confirmedLine(group, NOW)).toBe(false);
  });

  it('«أكّدتم حضور … لهذه الحلقة» on a confirmed lesson ahead only', () => {
    expect(confirmedLine(lesson({ status: 'confirmed' }), NOW)).toBe(true);
    expect(confirmedLine(lesson(), NOW)).toBe(false);
    expect(confirmedLine(lesson({ status: 'confirmed' }), new Date('2026-11-17T16:00:00Z'))).toBe(false);
  });
});
