import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { portalAssetsApi } from '..';

const link = { url: 'u', expires_at: 'x' };
const lesson = {
  lesson_id: 'L', lesson_starts_at: 'a', lesson_ends_at: 'b', teacher: null, report_id: null,
  recordings: [], files: [],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('portalAssetsApi (R-PRT)', () => {
  it('posts for a lesson file link with no body', async () => {
    const { client, apiSend } = clientAnswering(link);
    await portalAssetsApi(client).lessonFileUrl({ studentId: 'S', fileId: 'F' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/S/lesson-files/F/url', undefined);
  });

  it('asks for a saving link under the file’s name («تنزيل»)', async () => {
    const { client, apiSend } = clientAnswering(link);
    const download = 'ورقة 1.png';
    await portalAssetsApi(client).lessonFileUrl({ studentId: 'S', fileId: 'F', download });
    const path = `/portal/students/S/lesson-files/F/url?download=${encodeURIComponent(download)}`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, undefined);
  });

  it('reads the recordings and the lesson page under their path keys', async () => {
    const { client, apiFetch } = clientAnswering({ items: [] });
    const recordings = portalAssetsApi(client).portalRecordingsQuery('S');
    expect(recordings.queryKey).toEqual(['portal', 'students', 'S', 'recordings']);
    expect(recordings.refetchOnWindowFocus).toBe(true);
    await recordings.queryFn();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/S/recordings');
    apiFetch.mockResolvedValueOnce(lesson);
    const page = portalAssetsApi(client).portalLessonAssetsQuery({ studentId: 'S', lessonId: 'L' });
    await expect(page.queryFn()).resolves.toEqual(lesson);
    expect(apiFetch).toHaveBeenLastCalledWith('/portal/students/S/lessons/L/files');
  });

  it('throws bad_response on a link without its expiry', async () => {
    const { client } = clientAnswering({ url: 'u' });
    const call = portalAssetsApi(client).lessonFileUrl({ studentId: 'S', fileId: 'F' });
    await expect(call).rejects.toMatchObject({ code: 'bad_response' });
  });
});
