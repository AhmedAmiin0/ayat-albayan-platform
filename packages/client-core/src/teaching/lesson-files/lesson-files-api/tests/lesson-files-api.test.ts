import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { lessonFilesApi } from '..';

const view = {
  id: 'F', lesson_id: 'L', kind: 'homework', title: null, mime: 'image/png', size: 1,
  media: 'image', visible_to_family: false, created_at: '2026-11-16T17:00:00.000Z',
};
const upload = { mime: 'image/png', size: 1, kind: 'homework' } as const;
const signed = { bucket: 'b', path: 'p', token: 't', signed_url: 'https://x.test/u' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('lessonFilesApi (R-REC)', () => {
  it('patches the visibility and parses the answer', async () => {
    const { client, apiSend } = clientAnswering(view);
    const out = await lessonFilesApi(client).setVisible({ id: 'F', visible: false });
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/lesson-files/F/visibility', { visible: false });
    expect(out.visible_to_family).toBe(false);
  });

  it('reads the lesson page under its own key, off the schedule key', async () => {
    const { client, apiFetch } = clientAnswering({
      lesson_id: 'L', starts_at: 'a', ends_at: 'b', students: [], recordings: [], reports: [],
      files: [view],
    });
    const query = lessonFilesApi(client).lessonAssetsQuery('L');
    expect(query.queryKey).toEqual(['lesson-files', 'L']);
    await query.queryFn();
    expect(apiFetch).toHaveBeenCalledWith('/lessons/L/files');
  });

  it('asks for an upload link, then registers the file under the lesson', async () => {
    const { client, apiSend } = clientAnswering(signed);
    await expect(lessonFilesApi(client).uploadUrl({ lessonId: 'L', file: upload })).resolves
      .toEqual(signed);
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/L/files/upload-url', upload);
    apiSend.mockResolvedValueOnce(view);
    const file = { ...upload, path: 'p', visible_to_family: true };
    await lessonFilesApi(client).register({ lessonId: 'L', file });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/L/files', file);
  });

  it('deletes with no answer and asks for a download link with no body', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await expect(lessonFilesApi(client).remove('F')).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenCalledWith('DELETE', '/lesson-files/F', undefined);
    apiSend.mockResolvedValueOnce({ url: 'https://x.test/f', expires_at: 'x' });
    await lessonFilesApi(client).fileUrl('F');
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lesson-files/F/url', undefined);
  });

  it('encodes an id that holds a slash', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await lessonFilesApi(client).remove('a/b');
    expect(apiSend).toHaveBeenCalledWith('DELETE', '/lesson-files/a%2Fb', undefined);
  });

  it('throws bad_response on a file of an unknown kind', async () => {
    const { client } = clientAnswering({ ...view, kind: 'gift' });
    const call = lessonFilesApi(client).setVisible({ id: 'F', visible: true });
    await expect(call).rejects.toBeInstanceOf(ApiError);
    await expect(call).rejects.toMatchObject({ code: 'bad_response' });
  });
});
