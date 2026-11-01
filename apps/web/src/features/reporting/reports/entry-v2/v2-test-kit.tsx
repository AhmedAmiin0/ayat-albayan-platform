import { emptyContent, type MemoryView, type ReportContent, type ReportView, type UserRole } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Mock } from 'vitest';
import { formResponse, reportView } from '@/features/reporting/reports/report-fixture';
import { ReportFormPage } from '@/features/reporting/reports/ReportFormPage';

// Test-only helpers for the new form (form_version 2): one Quran student with a 4-lesson package.

export const MEMORY: MemoryView = {
  last: { recited: null, new: { surah: 67, from: 1, to: 15 }, revision: null },
  recent_surahs: [67, 68],
};

export const v2Content = (over: Partial<ReportContent> = {}): ReportContent => ({ ...emptyContent(), ...over });

export const v2Report = (over: Partial<ReportView> = {}): ReportView => reportView({ form_version: 2, content: emptyContent(), ...over });

/** Opens the report page on a v2 entry (role teacher unless said) and waits for its article. */
export async function openV2(opts: { apiFetch: Mock; report?: Partial<ReportView>; role?: UserRole; memory?: MemoryView | null }) {
  const form = formResponse({}, {});
  const entry = form.entries[0];
  if (!entry) throw new Error('fixture without an entry');
  form.entries = [{ ...entry, report: v2Report(opts.report), memory: opts.memory === undefined ? MEMORY : opts.memory }];
  opts.apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/lessons/l-1/report-form' ? form : []));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReportFormPage lessonId="l-1" role={opts.role ?? 'teacher'} />
    </QueryClientProvider>,
  );
  return screen.findByRole('article');
}

/** Picks a radio option inside a named group (fieldset legend). */
export const pick = (group: string, option: string) =>
  fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('radio', { name: option }));
