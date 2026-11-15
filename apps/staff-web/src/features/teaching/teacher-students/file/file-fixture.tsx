import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { Mock } from 'vitest';
import { TeacherStudentFile } from './TeacherStudentFile';
import { HEAD, LOG, PENDING, RECORDINGS } from './file-data';

// Test helper (not a test): renders «ملف الطالب» with every read answered from file-data.ts.

type Answer = readonly [match: (path: string) => boolean, body: () => unknown];

const answers = (head: () => unknown): Answer[] => [
  [(p) => p === '/settings/public', () => ({ ...PUBLIC_SETTING_DEFAULTS, custom: {} })],
  [(p) => p === '/teachers/me/students/s-1', head],
  [(p) => p.startsWith('/teachers/me/students/s-1/attendance'), () => LOG],
  [(p) => p === '/teachers/me/pending-reports', () => PENDING],
  [(p) => p === '/teachers/me', () => ({ tz: 'Africa/Cairo', students: [] })],
  [(p) => p.endsWith('/recorded-lesson-ids'), () => ['l-9']],
  [(p) => p.startsWith('/students/s-1/recordings'), () => RECORDINGS],
];

export interface RenderFileOptions {
  apiFetch: Mock;
  /** The head's answer: a value, or a function that throws (an ApiError). */
  head?: () => unknown;
}

/** Renders the file for student s-1, every read answered from the fixtures above. */
export function renderFile(o: RenderFileOptions) {
  const table = answers(o.head ?? (() => HEAD));
  const answer = (path: string) => table.find(([match]) => match(path))?.[1]() ?? [];
  o.apiFetch.mockImplementation(async (path: string) => answer(path));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TeacherStudentFile studentId="s-1" />
    </QueryClientProvider>,
  );
}
