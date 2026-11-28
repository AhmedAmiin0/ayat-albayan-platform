import { render, screen } from '@testing-library/react';
import { CLOCK_STORAGE_KEY } from '@ab/time';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, opensAtText } from '@ab/web-kit';
import { StudentLessonPanel } from './StudentLessonPanel';

const OPENS = '2026-10-03T15:45:00.000Z';
const lesson = {
  starts_at: '2026-10-03T16:00:00.000Z',
  ends_at: '2026-10-03T17:00:00.000Z',
  teacher_name: null,
  window: { opens_at: OPENS, closes_at: '2026-10-03T19:00:00.000Z' },
} as unknown as Parameters<typeof StudentLessonPanel>[0]['lesson'];
const refused = new ApiError(403, { code: 'join_not_open_yet', opens_at: OPENS });

afterEach(() => localStorage.removeItem(CLOCK_STORAGE_KEY));

describe('StudentLessonPanel: «تفتح الساعة …» on the web', () => {
  it('the waiting line and the refusal read 12 h even with a saved 24 h choice', () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    const props = { firstName: 'سلمى', pending: false, error: refused, onJoin: () => undefined };
    render(<StudentLessonPanel lesson={lesson} now={new Date('2026-10-03T15:00:00.000Z')} {...props} />);
    expect(screen.getByRole('alert').textContent).toBe(opensAtText(OPENS, '12'));
    expect(document.body.textContent).toContain(opensAtText(OPENS, '12'));
    expect(document.body.textContent).not.toContain(opensAtText(OPENS, '24'));
  });
});
