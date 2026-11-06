// Test-only helpers for the signed-in report form (ReportFormPage*.test.tsx).
import type { ReportFormResponse } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Mock } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { FULL_GRADES } from './report-fixture';
import { ReportFormPage } from './ReportFormPage';

/** The teacher's form for lesson l-1; `apiFetch` (the test's mock) answers the form GET. */
export function renderReportForm(apiFetch: Mock, form: ReportFormResponse) {
  apiFetch.mockImplementation((path: string) =>
    path === '/lessons/l-1/report-form' ? Promise.resolve(form) : Promise.resolve([]));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReportFormPage lessonId="l-1" role="teacher" />
    </QueryClientProvider>,
  );
}

export const pick = (group: string, option: string) =>
  fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('radio', { name: option }));

/** Every required answer of the old form. */
export function gradeEverything() {
  pick(t.reports.attendance, t.enums.attendance.on_time);
  for (const [rubric, grade] of Object.entries(FULL_GRADES)) {
    pick(t.reports.rubric[rubric as keyof typeof FULL_GRADES], t.enums.grade[grade]);
  }
  pick(t.reports.overall, t.enums.grade.excellent);
  for (const k of ['recited', 'newMemorization', 'revision', 'notes', 'homework'] as const) {
    fireEvent.change(screen.getByLabelText(t.reports[k]), { target: { value: 'done' } });
  }
}
