import { describe, expect, it } from 'vitest';
import { joinTarget, storedLink, type JoinLesson } from './join-target';

const T = '00000000-0000-4000-8000-0000000000b1';
const OTHER = '00000000-0000-4000-8000-0000000000b2';
const lesson = (over: Partial<JoinLesson> = {}): JoinLesson => ({
  id: 'L1',
  teacher_id: T,
  status: 'scheduled',
  ends_at: '2026-11-06T12:30:00Z',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  meeting_mode: 'static',
  ...over,
});
const ctx = {
  teacherId: T,
  auto: false,
  origin: 'https://app.example',
  now: new Date('2026-11-06T11:55:00Z'),
};

describe('joinTarget (GET /join/:token)', () => {
  it('the lesson’s own stored link (Meet, or the teacher’s fixed link on any host)', () => {
    expect(joinTarget(lesson(), ctx)).toBe('https://meet.google.com/abc-defg-hij');
    const zoom = lesson({ meeting_link: 'https://us06web.zoom.us/j/123' });
    expect(joinTarget(zoom, ctx)).toBe('https://us06web.zoom.us/j/123');
  });

  it('our classroom for a platform lesson, or when the lesson has no usable link', () => {
    const room = 'https://app.example/classroom/L1';
    expect(joinTarget(lesson({ meeting_mode: 'platform' }), ctx)).toBe(room);
    expect(joinTarget(lesson({ meeting_mode: null }), { ...ctx, auto: true })).toBe(room);
    expect(joinTarget(lesson({ meeting_link: null }), ctx)).toBe(room);
    expect(joinTarget(lesson({ meeting_link: 'javascript:alert(1)' }), ctx)).toBe(room);
  });

  it('never a foreign host other than the stored link: credentials and odd schemes are refused', () => {
    expect(storedLink('https://user:pw@evil.example/x')).toBeNull();
    expect(storedLink('ftp://evil.example/x')).toBeNull();
    expect(storedLink('//evil.example')).toBeNull();
    expect(storedLink('meet.google.com/abc')).toBeNull();
    const evil = lesson({ meeting_link: 'https://user:pw@evil.example/x' });
    expect(joinTarget(evil, ctx)).toBe('https://app.example/classroom/L1');
  });

  it('null: no lesson, another teacher’s, cancelled or moved, long over, or no web origin', () => {
    expect(joinTarget(null, ctx)).toBeNull();
    expect(joinTarget(lesson({ teacher_id: OTHER }), ctx)).toBeNull();
    expect(joinTarget(lesson({ status: 'cancelled_by_admin' }), ctx)).toBeNull();
    expect(joinTarget(lesson({ status: 'rescheduled' }), ctx)).toBeNull();
    expect(joinTarget(lesson(), { ...ctx, now: new Date('2026-11-06T14:30:00Z') })).toBeNull();
    expect(joinTarget(lesson(), { ...ctx, origin: '' })).toBeNull();
  });
});
