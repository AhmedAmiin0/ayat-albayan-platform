import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { LessonPage } from './LessonPage';
import { lessonPage, recording, signed } from './recordings.fixtures';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const F = t.lessonFiles;
const onBack = vi.fn();
const onOpenReport = vi.fn();
const show = () =>
  renderPortal(
    <LessonPage student={kid()} lessonId="L1" onOpenReport={onOpenReport} onBack={onBack} />,
  );

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  vi.clearAllMocks();
});

describe('LessonPage (`/lesson/<id>`, board FamFilesWebNoRec)', () => {
  it('a lesson with no recording: its title, the files with the report PDF first, the report', async () => {
    apiFetch.mockResolvedValue(lessonPage({ recordings: [] }));
    show();
    expect(screen.getByRole('heading', { name: F.lessonPage })).toBeTruthy();
    expect(await screen.findByText('ورقة الواجب')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/lessons/L1/files');
    expect(screen.getByRole('heading', { level: 1, name: /^حلقة / })).toBeTruthy();
    expect(screen.getByText(F.header.replace('{n}', '2'))).toBeTruthy();
    expect(screen.queryByLabelText(F.recording, { selector: 'audio' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: F.openReport }));
    expect(onOpenReport).toHaveBeenCalledWith({ reportId: 'r-L1', recordingId: null });
    fireEvent.click(screen.getByRole('button', { name: t.common.back }));
    expect(onBack).toHaveBeenCalled();
  });

  it('a video recording plays with its picture, the student’s code over it', async () => {
    apiFetch.mockResolvedValue(lessonPage({ recordings: [recording({ media: 'video' })] }));
    apiSend.mockResolvedValue(signed('https://files.example/v.mp4'));
    show();
    const video = await screen.findByLabelText(F.recording, { selector: 'video' });
    expect(video.getAttribute('src')).toBe('https://files.example/v.mp4');
    expect(screen.getAllByText('AB-0201')).toHaveLength(2);
    expect(screen.getByText(t.familyFiles.videoChip.replace('{minutes}', '44'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t.familyFiles.fullscreen })).toBeTruthy();
  });

  it('a lesson the family cannot open (404): «صفحة الحلقة» with a retry', async () => {
    apiFetch.mockRejectedValue(new Error('lesson_not_found'));
    show();
    expect(await screen.findByText(t.portal.loadFailed)).toBeTruthy();
    expect(screen.getByRole('heading', { name: F.lessonPage })).toBeTruthy();
  });
});
