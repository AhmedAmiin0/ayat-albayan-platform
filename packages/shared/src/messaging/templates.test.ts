import { describe, expect, it } from 'vitest';
import { messageExpired } from './templates.js';

const now = new Date('2026-10-04T14:00:00Z');
const base = { templateKey: 'lesson_reminder', expiresAt: null, lessonStartsAt: null, now };

describe('messageExpired (docs/12 §3)', () => {
  it.each([
    ['expires_at passed', { expiresAt: '2026-10-04T13:59:00Z' }, true],
    ['expires_at ahead', { expiresAt: '2026-10-04T14:01:00Z' }, false],
    ['expires_at wins over the lesson', { expiresAt: '2026-10-05T00:00:00Z', lessonStartsAt: '2026-10-04T13:00:00Z' }, false],
    ['reminder, lesson started', { lessonStartsAt: '2026-10-04T14:00:00Z' }, true],
    ['reminder, lesson ahead', { lessonStartsAt: '2026-10-04T15:00:00Z' }, false],
    ['booking confirmation (RPC row), lesson started', { templateKey: 'booking_confirmation_meet', lessonStartsAt: '2026-10-04T13:00:00Z' }, true],
    ['report_ready of a past lesson never expires', { templateKey: 'report_ready', lessonStartsAt: '2026-10-01T13:00:00Z' }, false],
    ['session text (no key)', { templateKey: null, lessonStartsAt: '2026-10-01T13:00:00Z' }, false],
  ])('%s → %s', (_name, over, expired) => {
    expect(messageExpired({ ...base, ...over })).toBe(expired);
  });
});
