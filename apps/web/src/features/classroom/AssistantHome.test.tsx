import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AssistantHome } from './AssistantHome';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * 60_000).toISOString();
const row = (id: string, start: number, status = 'confirmed') => ({
  lesson_id: id, starts_at: iso(start), ends_at: iso(start + 45), status, teacher_name: 'أبرار', student_names: ['سهيلة', 'جود'],
});

function open(rows: unknown[]) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AssistantHome />
    </QueryClientProvider>,
  );
}

describe('AssistantHome', () => {
  afterEach(() => apiFetch.mockReset());

  it('asks for the local day and lists sessions with names and teacher', async () => {
    open([row('l-1', 5)]);
    expect(await screen.findByText(/سهيلة، جود/)).toBeTruthy();
    expect(screen.getByText(/أبرار/)).toBeTruthy();
    const url = apiFetch.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/^\/assistants\/me\/lessons\?from=.+&to=.+/);
  });

  it('«ادخل الحلقة» is a link when open and disabled when far off', async () => {
    open([row('l-open', 5), row('l-later', 300)]);
    const link = await screen.findByRole('link', { name: t.classroom.enter });
    expect(link.getAttribute('href')).toBe('/classroom/l-open');
    expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
  });

  it('hides cancelled sessions, and says when there is nothing today', async () => {
    open([row('l-x', 5, 'cancelled_by_admin')]);
    expect(await screen.findByText(t.classroom.assistants.homeEmpty)).toBeTruthy();
  });
});
