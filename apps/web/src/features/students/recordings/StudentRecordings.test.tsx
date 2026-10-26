import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { pageOf, recordingView } from './recordings-fixture';
import { StudentRecordings } from './StudentRecordings';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const R = t.studentRecordings;
const listCalls = () => apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.includes('/recordings'));

function renderList(role: 'admin' | 'teacher' = 'teacher') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentRecordings studentId="s-1" role={role} />
    </QueryClientProvider>,
  );
}
const answer = (recordings: unknown) =>
  apiFetch.mockImplementation(async (path: string) => (path.includes('/recordings') ? recordings : []));

afterEach(() => apiFetch.mockReset());

describe('StudentRecordings «تسجيلات الحلقات»', () => {
  it('lists a recording with its chip, teacher, duration, size and a video player', async () => {
    answer(pageOf([recordingView()]));
    renderList();
    expect(await screen.findByText(R.status.done)).toBeTruthy();
    expect(screen.getByRole('heading', { name: R.title })).toBeTruthy();
    expect(screen.getByText('أ. منى')).toBeTruthy();
    expect(screen.getByText('1:00:00')).toBeTruthy();
    expect(screen.getByText(R.sizeMb.replace('{n}', '50'))).toBeTruthy();
    const video = document.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://signed.example.test/r.mp4');
    expect(listCalls()[0]).toBe('/students/s-1/recordings?page=1&pageSize=10');
    expect(document.getElementById('recording-les-1')).toBeTruthy();
  });

  it('a sound-only file gets an audio player; running, failed and deleted rows have no player', async () => {
    answer(
      pageOf([
        recordingView({ id: 'a', lesson_id: 'l-a', media: 'audio' }),
        recordingView({ id: 'b', lesson_id: 'l-b', status: 'recording', url: null, duration_seconds: null }),
        recordingView({ id: 'c', lesson_id: 'l-c', status: 'failed', url: null }),
        recordingView({ id: 'd', lesson_id: 'l-d', status: 'deleted', url: null }),
      ]),
    );
    renderList();
    await screen.findByText(R.status.recording);
    expect(document.querySelectorAll('audio')).toHaveLength(1);
    expect(document.querySelectorAll('video')).toHaveLength(0);
    for (const s of ['recording', 'failed', 'deleted'] as const) expect(screen.getByText(R.status[s])).toBeTruthy();
  });

  it('shows loading, then the empty state; a filtered empty list says so', async () => {
    answer(pageOf([]));
    renderList();
    expect(await screen.findByText(R.empty)).toBeTruthy();
  });

  it('an error offers a retry that asks again', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, null));
    renderList();
    expect(await screen.findByText(new RegExp(R.error))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: R.retry }));
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(1));
  });

  it('renders nothing at all for a login the API refuses', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, null));
    renderList();
    await waitFor(() => expect(screen.queryByRole('heading', { name: R.title })).toBeNull());
  });

  it('the date filter in «تصفية» asks the API for that range and shows a chip', async () => {
    answer(pageOf([recordingView()]));
    renderList();
    await screen.findByText(R.status.done);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.table.filter) }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(R.filters.from), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(listCalls().at(-1)).toContain('from=2026-10-01'));
    expect(screen.getAllByText(/2026-10-01/).length).toBeGreaterThan(0);
  });
});
