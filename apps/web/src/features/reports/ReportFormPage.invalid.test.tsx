import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { formResponse } from './report-fixture';
import { ReportFormPage } from './ReportFormPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const pick = (group: string, option: string) =>
  fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('radio', { name: option }));

describe('ReportFormPage: required marks and a failed submit (web matches the app)', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/lessons/l-1/report-form' ? formResponse() : []));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ReportFormPage lessonId="l-1" role="teacher" />
      </QueryClientProvider>,
    );
  });
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a «* مطلوب» legend; attendance and the six grades + overall carry the mark', async () => {
    await screen.findByRole('region', { name: t.reports.identity });
    expect(screen.getByText(t.common.requiredLegend)).toBeTruthy();
    for (const name of [t.reports.attendance, t.reports.overall, t.reports.rubric.tajweed]) {
      expect(screen.getByRole('group', { name }).querySelector('legend [aria-hidden="true"]')).toBeTruthy();
    }
    // The theory line was never required on the form.
    expect(screen.getByLabelText(t.reports.theory).closest('div')?.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('a failed submit marks every empty grade row and lands on the first one', async () => {
    await screen.findByRole('region', { name: t.reports.identity });
    pick(t.reports.attendance, t.enums.attendance.on_time);
    pick(t.reports.rubric.recitation, t.enums.grade.excellent);
    fireEvent.click(screen.getByRole('button', { name: t.reports.submit }));
    expect(await screen.findByText(t.reports.error.missing_grades)).toBeTruthy();
    const bad = ['memorization', 'revision', 'tajweed', 'engagement', 'commitment'] as const;
    for (const r of bad) expect(screen.getByRole('group', { name: t.reports.rubric[r] }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('group', { name: t.reports.overall }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('group', { name: t.reports.rubric.recitation }).getAttribute('aria-invalid')).toBeNull();
    // First empty row: its first radio has focus.
    const first = screen.getByRole('group', { name: t.reports.rubric.memorization }).querySelector('input');
    expect(document.activeElement).toBe(first);
  });
});
