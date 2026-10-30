import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setClockPref } from '@/lib/clock';
import { ApiError } from '@/lib/http/api';
import { opensAtText } from '@/features/teaching/classroom/room/livekit/window-hint';
import { StudentLessonPanel } from './StudentLessonPanel';

const OPENS = '2026-10-03T15:45:00.000Z';
const lesson = {
  starts_at: '2026-10-03T16:00:00.000Z',
  ends_at: '2026-10-03T17:00:00.000Z',
  teacher_name: null,
  window: { opens_at: OPENS, closes_at: '2026-10-03T19:00:00.000Z' },
} as unknown as Parameters<typeof StudentLessonPanel>[0]['lesson'];
const refused = new ApiError(403, { code: 'join_not_open_yet', opens_at: OPENS });

afterEach(() => act(() => setClockPref('24')));

describe('StudentLessonPanel: «تفتح الساعة …» follows «تنسيق الوقت»', () => {
  it('the waiting line and the refusal re-word after a 24 → 12 h switch, no remount', () => {
    act(() => setClockPref('24'));
    const props = { firstName: 'سلمى', pending: false, error: refused, onJoin: () => undefined };
    render(<StudentLessonPanel lesson={lesson} now={new Date('2026-10-03T15:00:00.000Z')} {...props} />);
    expect(screen.getByRole('alert').textContent).toBe(opensAtText(OPENS, '24'));

    act(() => setClockPref('12'));
    expect(screen.getByRole('alert').textContent).toBe(opensAtText(OPENS, '12'));
    expect(document.body.textContent).toContain(opensAtText(OPENS, '12'));
    expect(document.body.textContent).not.toContain(opensAtText(OPENS, '24'));
  });
});
