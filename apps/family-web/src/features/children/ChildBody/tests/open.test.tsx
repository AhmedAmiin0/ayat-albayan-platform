import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kid, portalApi } from '@ab/web-kit/testing';
import { ChildBody } from '@/features/children/ChildBody/ChildBody';
import { renderAt } from '@/test/render-at';

interface PanelProps {
  onOpenReport: (report: { reportId: string; recordingId: string | null }) => void;
  onOpenLesson: (lessonId: string) => void;
}

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/room', async (orig) => ({
  ...(await orig<object>()),
  ChildPanel: ({ onOpenReport, onOpenLesson }: PanelProps) => (
    <div>
      <button type="button" onClick={() => onOpenReport({ reportId: 'r1', recordingId: 'v1' })}>
        report with recording
      </button>
      <button type="button" onClick={() => onOpenReport({ reportId: 'r2', recordingId: null })}>
        report alone
      </button>
      <button type="button" onClick={() => onOpenLesson('l1')}>
        lesson
      </button>
    </div>
  ),
}));

const show = () =>
  renderAt(<ChildBody student={kid()} kind="guardian" onTab={vi.fn()} />, '/children/s1');

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi());
});

describe('ChildBody opens what its panel asks for', () => {
  it('a report with its recording, for this child', async () => {
    const { router } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'report with recording' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/report/r1'));
    expect(router.state.location.search).toEqual({ studentId: 's1', recording: 'v1' });
  });

  it('a report without a recording asks for none', async () => {
    const { router } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'report alone' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/report/r2'));
    expect(router.state.location.search).toEqual({ studentId: 's1' });
  });

  it('a lesson page, for this child', async () => {
    const { router } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'lesson' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/lesson/l1'));
    expect(router.state.location.search).toEqual({ studentId: 's1' });
  });
});
