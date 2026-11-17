import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { assets, LESSON } from './lesson-files.fixture';
import { LessonFilesSection } from './LessonFilesSection';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

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
