import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LessonRecording } from './LessonRecording';
import { pageOf, recordingView } from './recordings-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const NO_RETRY = { defaultOptions: { queries: { retry: false } } };

function show() {
  render(
    <QueryClientProvider client={new QueryClient(NO_RETRY)}>
      <LessonRecording studentId="s-1" lessonId="les-1" startsAt="2026-10-05T16:00:00.000Z" />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('LessonRecording: one lesson’s recording inside its row (docs/49)', () => {
  it('asks for that UTC day only and shows the lesson’s own recording', async () => {
    apiFetch.mockResolvedValue(pageOf([recordingView({ id: 'x', lesson_id: 'other' }), recordingView()]));
    show();
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(document.getElementById('recording-les-1')).toBeTruthy();
    expect(String(apiFetch.mock.calls[0]?.[0])).toContain('from=2026-10-05&to=2026-10-05');
  });

  it('a skeleton while it loads', async () => {
    apiFetch.mockReturnValueOnce(new Promise(() => undefined));
    show();
    expect(screen.getByText(t.common.loading)).toBeTruthy();
  });

  it('a failed read says so quietly', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    show();
    const line = await screen.findByText(t.common.error);
    expect(line.tagName).toBe('P');
  });
});
