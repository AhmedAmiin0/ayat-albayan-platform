import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { kid } from '#/portal/portal.fixtures.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { RecordingsPanel } from '#/portal/recordings/RecordingsPanel/RecordingsPanel.tsx';
import { lessonPage, recording, signed } from '#/portal/recordings/recordings.fixtures.ts';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const FF = t.familyFiles;
const items = [
  recording(),
  recording({ id: 'B', lesson_id: 'L2', lesson_starts_at: '2026-11-10T14:00:00.000Z', media: 'video' }),
];

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  apiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/recordings') ? { items } : lessonPage());
  apiSend.mockResolvedValue(signed());
});

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('RecordingsPanel: what plays, and audio beside video (boards FamRecWebParts, FamRecWebVideo)', () => {
  it('marks the playing lesson «قيد التشغيل» until it pauses', async () => {
    renderPortal(<RecordingsPanel student={kid()} onOpenReport={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.audioPlayer.play }));
    const rows = screen.getAllByRole('button', { pressed: true });
    expect(within(rows[0] as HTMLElement).getByText(FF.playing)).toBeTruthy();
    fireEvent.pause(screen.getByLabelText(t.lessonFiles.recording, { selector: 'audio' }));
    expect(screen.queryByText(FF.playing)).toBeNull();
  });

  it('with a video among them: the mixed hint and «صوتي» / «مرئي» on each row', async () => {
    renderPortal(<RecordingsPanel student={kid()} onOpenReport={vi.fn()} />);
    expect(await screen.findByText(FF.mixedHint)).toBeTruthy();
    expect(screen.getByText(FF.audioMark)).toBeTruthy();
    expect(screen.getByText(FF.videoMark)).toBeTruthy();
  });

  it('a picture opens in the viewer on the page, not a new tab', async () => {
    vi.stubGlobal('open', vi.fn());
    renderPortal(<RecordingsPanel student={kid()} onOpenReport={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.lessonFiles.open }));
    expect(await screen.findByRole('dialog', { name: 'ورقة الواجب' })).toBeTruthy();
    expect(window.open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
