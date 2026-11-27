import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { stickerPanelCalls } from '../sticker-panel-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const ITEM = { message_id: ID, phone: '+966500000001', key: 'sha:Zm9v' };
const GIF = { id: 'abc123', title: '', preview: 'https://media.giphy.com/a.gif', width: 200, height: 112 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('sticker panel calls', () => {
  it('reads the sticker list on the path of today', async () => {
    const list = { favourites: [ITEM], recent: [ITEM] };
    const { client, apiFetch } = clientAnswering(list);
    await expect(stickerPanelCalls(client).list()).resolves.toEqual(list);
    expect(apiFetch.mock.calls).toEqual([['/threads/stickers']]);
  });

  it('saves a favourite with its message id and removes one by the id in the path', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    const calls = stickerPanelCalls(client);
    await expect(calls.favourite({ messageId: ID })).resolves.toBeUndefined();
    await expect(calls.unfavourite({ messageId: ID })).resolves.toBeUndefined();
    expect(apiSend.mock.calls).toEqual([
      ['PUT', '/threads/stickers/favourites', { messageId: ID }],
      ['DELETE', `/threads/stickers/favourites/${ID}`, undefined],
    ]);
  });

  it('searches GIFs with the words encoded and asks trending ones without words', async () => {
    const { client, apiFetch } = clientAnswering({ configured: true, items: [GIF] });
    const calls = stickerPanelCalls(client);
    await expect(calls.gifs({ q: 'شكرا لك' })).resolves.toEqual({ configured: true, items: [GIF] });
    await calls.gifs({ q: '' });
    await calls.gifs({});
    expect(apiFetch.mock.calls).toEqual([
      [`/threads/gifs?q=${encodeURIComponent('شكرا لك')}`],
      ['/threads/gifs'],
      ['/threads/gifs'],
    ]);
  });

  it('refuses a sticker list with no recent ones and a GIF list with no flag', async () => {
    const noRecent = stickerPanelCalls(clientAnswering({ favourites: [] }).client);
    await expect(noRecent.list()).rejects.toBeInstanceOf(ApiError);
    const noFlag = stickerPanelCalls(clientAnswering({ items: [] }).client);
    await expect(noFlag.gifs({})).rejects.toBeInstanceOf(ApiError);
  });
});
