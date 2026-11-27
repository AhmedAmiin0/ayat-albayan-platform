import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { assets, fileView, LESSON } from './lesson-files.fixture';
import { LessonFilesSection } from './LessonFilesSection';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const F = t.lessonFiles;

function show(data = assets()) {
  apiFetch.mockResolvedValue(data);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonFilesSection lessonId={LESSON} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('LessonFilesSection', () => {
  it('lists the recording and the file from GET /lessons/:id/files', async () => {
    show();
    expect(await screen.findByText('ورقة الواجب')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/lessons/${LESSON}/files`);
    expect(screen.getByLabelText(F.recording, { selector: 'audio' })).toBeTruthy();
  });

  it('shows the recording to the family through PATCH /recordings/:id/visibility', async () => {
    show();
    apiSend.mockResolvedValue({});
    const boxes = await screen.findAllByRole('checkbox', { name: F.visible });
    fireEvent.click(boxes[0] as HTMLElement);
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/recordings/rec-1/visibility', { visible: true }));
  });

  it('a group lesson’s recording cannot be shown', async () => {
    const students = [{ id: 'a', name: 'أ', code: null }, { id: 'b', name: 'ب', code: null }];
    show(assets({ students, files: [] }));
    const [box] = await screen.findAllByRole('checkbox', { name: F.visible });
    expect((box as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(t.studentRecordings.visible.groupLesson)).toBeTruthy();
  });
});

describe('LessonFilesSection files', () => {
  it('lists the report PDF; a hidden file keeps its label with the note under it', async () => {
    const reports = [{ id: 'rep-1', student_name: 'سلمى', pdf_ready: true, sent_at: null }];
    show(assets({ reports, files: [fileView({ visible_to_family: false })] }));
    expect(await screen.findByText(F.reportPdf)).toBeTruthy();
    expect(screen.getByText(F.reportPdfNote)).toBeTruthy();
    // The recording's, the file's and the upload box's: one label for all three.
    expect(screen.getAllByRole('checkbox', { name: F.visible })).toHaveLength(3);
    expect(screen.getAllByText(F.hidden).length).toBeGreaterThan(0);
  });

  it('«أزل الملف» asks once more, then removes', async () => {
    show();
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(await screen.findByRole('button', { name: F.remove }));
    expect(apiSend).not.toHaveBeenCalled();
    expect(screen.getByText(F.removeConfirmBody)).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: F.remove }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('DELETE', '/lesson-files/f-1', undefined),
    );
  });
});
