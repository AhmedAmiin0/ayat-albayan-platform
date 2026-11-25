import type { NotificationItem } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { alertSections, alertTarget, pushTarget } from './alerts';

const S = '11111111-1111-4111-8111-111111111111';
const R = '22222222-2222-4222-8222-222222222222';
const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1', kind: 'report_sent', title: 'تقرير', body: '', data: {},
  created_at: '2026-11-15T08:00:00.000Z', read_at: null, ...over,
});

describe('«بدأت الحلقة» (lesson_live, owner 2026-11-16)', () => {
  const L = '33333333-3333-4333-8333-333333333333';

  it('a row or a tapped push opens that lesson; without a lesson id, the child', () => {
    const data = { studentId: S, lessonId: L };
    const live = { screen: 'live', studentId: S, lessonId: L };
    expect(alertTarget(item({ kind: 'lesson_live', data }))).toEqual(live);
    expect(pushTarget({ kind: 'lesson_live', ...data })).toEqual(live);
    expect(alertTarget(item({ kind: 'lesson_live', data: { studentId: S } }))).toEqual({
      screen: 'child', studentId: S,
    });
  });

  it('a push of an unknown kind or unreadable data opens nothing', () => {
    expect(pushTarget({ kind: 'nope', studentId: S })).toBeNull();
    expect(pushTarget({ kind: 'lesson_live', studentId: 7 })).toBeNull();
    expect(pushTarget(null)).toBeNull();
  });
});

describe('alertTarget', () => {
  it('a sent report opens the report; a bad id opens nothing', () => {
    expect(alertTarget(item({ data: { studentId: S, reportId: R } }))).toEqual({
      screen: 'report', studentId: S, reportId: R,
    });
    expect(alertTarget(item({ data: { studentId: S, reportId: 'x' } }))).toBeNull();
  });

  it('a lesson opens the child, else the week; a payment the package', () => {
    expect(alertTarget(item({ kind: 'lesson_starting', data: { studentId: S } }))).toEqual({
      screen: 'child', studentId: S,
    });
    expect(alertTarget(item({ kind: 'lesson_cancelled', data: {} }))).toEqual({ screen: 'schedule' });
    expect(alertTarget(item({ kind: 'payment_received', data: { studentId: S } }))).toEqual({
      screen: 'package', studentId: S,
    });
    expect(alertTarget(item({ kind: 'new_lead', data: { studentId: S } }))).toBeNull();
  });

  it('a chat message opens that child’s chat (owner 2026-11-16); a bad id the week', () => {
    expect(alertTarget(item({ kind: 'channel_message', data: { studentId: S } }))).toEqual({
      screen: 'chat', studentId: S,
    });
    expect(alertTarget(item({ kind: 'channel_message', data: { studentId: '../x' } }))).toEqual({
      screen: 'schedule',
    });
  });
});

describe('alertSections', () => {
  it('today, yesterday, this week and older on the viewer calendar', () => {
    const now = new Date('2026-11-15T10:00:00.000Z');
    const rows = [
      item({ id: 'a', created_at: '2026-11-15T08:00:00.000Z' }),
      item({ id: 'b', created_at: '2026-11-14T08:00:00.000Z' }),
      item({ id: 'c', created_at: '2026-11-11T08:00:00.000Z' }),
      item({ id: 'd', created_at: '2026-10-01T08:00:00.000Z' }),
    ];
    const sections = alertSections(rows, now, 'Asia/Riyadh');
    expect(sections.map((s) => [s.group, s.items.map((i) => i.id)])).toEqual([
      ['today', ['a']],
      ['yesterday', ['b']],
      ['week', ['c']],
      ['older', ['d']],
    ]);
    expect(alertSections([], now, 'UTC')).toEqual([]);
  });
});
