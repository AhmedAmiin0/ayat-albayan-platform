import type { AssistantLessonView } from '@ab/schedule';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { CLOCK_STORAGE_KEY } from '@ab/time';
import { afterEach, describe, expect, it } from 'vitest';
import { AssistantLessonRow } from './AssistantLessonRow';

// jsdom's zone is UTC: 14:30Z reads 2:30 PM.
const LESSON: AssistantLessonView = {
  lesson_id: 'l-1',
  starts_at: '2026-10-03T14:30:00Z',
  ends_at: '2026-10-03T15:15:00Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['سهيلة'],
};

afterEach(() => localStorage.removeItem(CLOCK_STORAGE_KEY));

describe('a lesson time on the web', () => {
  it('reads 12 h even when the browser saved a 24 h choice', () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ul>
          <AssistantLessonRow lesson={LESSON} />
        </ul>
      </QueryClientProvider>,
    );
    expect(screen.getByText('2:30 م').getAttribute('dir')).toBe('rtl');
    expect(screen.queryByText('14:30')).toBeNull();
  });
});
