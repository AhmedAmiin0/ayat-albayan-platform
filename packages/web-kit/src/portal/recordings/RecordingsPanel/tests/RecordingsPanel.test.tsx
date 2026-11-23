import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { kid } from '#/portal/portal.fixtures.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { RecordingsPanel } from '#/portal/recordings/RecordingsPanel/RecordingsPanel.tsx';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const F = t.lessonFiles;
const rec = (id: string, lesson: string) => ({
  id, lesson_id: lesson, report_id: `r-${lesson}`, lesson_starts_at: '2026-11-15T14:00:00.000Z',
  teacher: { display_name_ar: 'مريم', display_name_en: null }, duration_seconds: 2640,
  size_bytes: null, media: 'audio',
});
const page = {
  lesson_id: 'L1', lesson_starts_at: '2026-11-15T14:00:00.000Z', lesson_ends_at: '2026-11-15T14:45:00.000Z',
  teacher: null, report_id: 'r-L1', recordings: [rec('A', 'L1')],
  files: [{
    id: 'f1', lesson_id: 'L1', kind: 'homework', title: 'ورقة الواجب', mime: 'image/png', size: 900,
    media: 'image', created_at: '2026-11-15T15:00:00.000Z',
  }],
};

function reads(items: unknown[]) {
  apiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/recordings') ? { items } : page);
  apiSend.mockResolvedValue({ url: 'https://files.example/a.mp3', expires_at: 'x' });
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('RecordingsPanel', () => {
  it('says why there is nothing yet (Meet lessons, sent reports, group lessons)', async () => {
    reads([]);
    renderPortal(<RecordingsPanel student={kid()} onOpenReport={vi.fn()} />);
    expect(await screen.findByText(F.empty)).toBeTruthy();
    expect(screen.getByText(new RegExp(F.emptyRoom))).toBeTruthy();
    expect(screen.queryByText(F.recordingsHint)).toBeNull();
  });

  it('opens the newest lesson: its player, its files, and the full report', async () => {
    reads([rec('A', 'L1'), rec('B', 'L1')]);
    const onOpenReport = vi.fn();
    renderPortal(<RecordingsPanel student={kid()} onOpenReport={onOpenReport} />);
    expect(await screen.findByText('ورقة الواجب')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/lessons/L1/files');
    expect(await screen.findByLabelText(F.recording, { selector: 'audio' })).toBeTruthy();
    expect(screen.getAllByText(F.isNew)).toHaveLength(1);
    expect(screen.getByText(F.reportPdf)).toBeTruthy();
    expect(screen.getByText(F.header.replace('{n}', '2'))).toBeTruthy();
    expect(screen.getByText(/· جزءان$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: F.openReport }));
    expect(onOpenReport).toHaveBeenCalledWith({ reportId: 'r-L1', recordingId: null });
  });
});

describe('RecordingsPanel parts', () => {
  it('a lesson recorded in parts picks one: «الجزء 1 · 44 دقيقة»', async () => {
    reads([rec('A', 'L1'), rec('B', 'L1')]);
    apiFetch.mockImplementation(async (path: string) => (path.endsWith('/recordings')
      ? { items: [rec('A', 'L1'), rec('B', 'L1')] }
      : { ...page, recordings: [rec('B', 'L1'), rec('A', 'L1')] }));
    renderPortal(<RecordingsPanel student={kid()} onOpenReport={vi.fn()} />);
    const second = await screen.findByRole('radio', { name: 'الجزء 2 · 44 دقيقة' });
    fireEvent.click(second);
    expect((second as HTMLInputElement).checked).toBe(true);
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/recordings/B/url');
  });
});
