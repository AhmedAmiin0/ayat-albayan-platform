import type { AssistantLessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setClockPref } from '@/lib/clock';
import { AssistantLessonRow } from './AssistantLessonRow';

// jsdom's zone is UTC: 14:30Z reads «14:30» / «2:30 م».
const LESSON: AssistantLessonView = {
  lesson_id: 'l-1',
  starts_at: '2026-10-03T14:30:00Z',
  ends_at: '2026-10-03T15:15:00Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['سهيلة'],
};

afterEach(() => setClockPref('24'));

describe('«تنسيق الوقت» on a screen', () => {
  it('switches a lesson time between 24 h and 12 h at once, no reload', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ul>
          <AssistantLessonRow lesson={LESSON} />
        </ul>
      </QueryClientProvider>,
    );
    expect(screen.getByText('14:30')).toBeTruthy();
    act(() => setClockPref('12'));
    expect(screen.getByText('2:30 م').getAttribute('dir')).toBe('rtl');
    act(() => setClockPref('24'));
    expect(screen.getByText('14:30').getAttribute('dir')).toBe('ltr');
  });
});
