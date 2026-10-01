import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { JobApplicantsList } from './JobApplicantsList';
import type { JobApplicantRow } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch, apiSend: vi.fn() }));

const row = (over: Partial<JobApplicantRow>): JobApplicantRow => ({
  id: 'a1',
  phone_e164: '+201001234567',
  name: 'أ. منى',
  status: 'new',
  cv_url: 'https://example.com/cv.pdf',
  recitation_url: null,
  notes: null,
  created_at: '2026-09-28T10:00:00+00:00',
  ...over,
});

function renderList(items: JobApplicantRow[]) {
  apiFetch.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 25 });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JobApplicantsList search={{ page: 1 }} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('JobApplicantsList (R-LEAD-04)', () => {
  it('lists applicants with status label and CV link', async () => {
    renderList([row({})]);
    expect(await screen.findByText('أ. منى')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.jobApplicants.title })).toBeTruthy();
    expect(screen.getByText(t.jobApplicants.count.replace('{n}', '1'))).toBeTruthy();
    expect(screen.getByText('+20 10 0123 4567').getAttribute('dir')).toBe('ltr');
    // A new applicant is not the admin's «دورك»: neutral, never saffron (docs/07 §6).
    const chip = screen.getByText(t.enums.jobApplicantStatus.new).closest('[data-tone]');
    expect(chip?.getAttribute('data-tone')).toBe('neutral');
    expect(screen.getByRole('link', { name: t.jobApplicants.cv }).getAttribute('href')).toBe(
      'https://example.com/cv.pdf',
    );
    expect(apiFetch).toHaveBeenCalledWith('/job-applicants?page=1&pageSize=25');
  });

  // A value that will never get an ar.json label.
  it('shows a status without an ar.json label as its raw value', async () => {
    renderList([row({ status: 'not_a_status' })]);
    const raw = await screen.findByText('not_a_status');
    expect(raw.closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
  });

  it('shows the Arabic empty state', async () => {
    renderList([]);
    expect(await screen.findByRole('heading', { name: t.jobApplicants.empty })).toBeTruthy();
  });
});
