import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { teacherPhotoCalls, userPhotoCalls } from './staff-photo-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const view = { avatar_url: 'https://cdn.test/a.webp' };
const upload = {
  bucket: 'avatars',
  path: `${ID}/a.webp`,
  token: 't',
  signed_url: 'https://s.test',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('staff photo calls', () => {
  it('asks a teacher photo upload slot and writes the stored path', async () => {
    const slot = clientAnswering(upload);
    const body = { mime: 'image/webp' as const, size: 10 };
    await expect(teacherPhotoCalls(slot.client).uploadUrl(ID, body)).resolves.toEqual(upload);
    expect(slot.apiSend).toHaveBeenCalledWith('POST', `/teachers/${ID}/avatar/upload-url`, body);
    const saved = clientAnswering(view);
    await expect(teacherPhotoCalls(saved.client).set(ID, { path: upload.path })).resolves.toEqual(
      view,
    );
    expect(saved.apiSend).toHaveBeenCalledWith('PUT', `/teachers/${ID}/avatar`, {
      path: upload.path,
    });
  });

  it('sends a staff login photo to its /users paths', async () => {
    const { client, apiSend } = clientAnswering(view);
    const calls = userPhotoCalls(client);
    await calls.set(ID, { path: upload.path });
    await calls.remove(ID);
    expect(apiSend.mock.calls).toEqual([
      ['PUT', `/users/${ID}/avatar`, { path: upload.path }],
      ['DELETE', `/users/${ID}/avatar`, undefined],
    ]);
  });

  it('throws bad_response for a removal answer without avatar_url', async () => {
    const { client } = clientAnswering({});
    const failure = await teacherPhotoCalls(client)
      .remove(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
