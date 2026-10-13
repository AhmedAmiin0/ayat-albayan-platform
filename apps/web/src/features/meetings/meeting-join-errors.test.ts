import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { meetingJoinProblem } from './meeting-join-errors';

const R = t.meetings.internal.refusal;

describe('meetingJoinProblem: a refused meeting join in a meeting’s words', () => {
  it('not open yet: the opening day and time on the viewer’s clock, never «الحلقة» nor a fixed 15 minutes', () => {
    const text = meetingJoinProblem(new ApiError(403, { code: 'join_not_open_yet', opens_at: '2026-10-05T11:30:00.000Z' }), 'Asia/Riyadh');
    expect(text.startsWith(R.notOpen.replace('.', ''))).toBe(true);
    expect(text).toContain('14:30');
    expect(text).toContain('5');
    expect(text).not.toContain('الحلقة');
    expect(text).not.toContain('15');
  });

  it('not open yet without opens_at, closed, forbidden: meeting lines; anything else the classroom line', () => {
    expect(meetingJoinProblem(new ApiError(403, { code: 'join_not_open_yet' }), 'UTC')).toBe(R.notOpen);
    expect(meetingJoinProblem(new ApiError(410, { code: 'join_closed' }), 'UTC')).toBe(R.closed);
    expect(meetingJoinProblem(new ApiError(403, { code: 'forbidden' }), 'UTC')).toBe(R.forbidden);
    expect(meetingJoinProblem(new ApiError(410, { code: 'meeting_ended' }), 'UTC')).toBe(t.classroom.error.meeting_ended);
    for (const code of ['join_not_open_yet', 'join_closed', 'forbidden']) {
      expect(meetingJoinProblem(new ApiError(403, { code }), 'UTC')).not.toContain('الحلقة');
    }
  });
});
