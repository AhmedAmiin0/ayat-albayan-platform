import { describe, expect, it } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import {
  channelWriterOf,
  channelWritesByAudience,
  portalChannelWrites,
  salesChannelWrites,
  teacherChannelWrites,
  type ChannelSlotAsk,
  type ChannelWriteCalls,
} from '..';
import { BEFORE, clientAnswering, MESSAGE, message, STUDENT } from './answers.test-util';

const SLOT = { bucket: 'channel-media', path: 'ch/f.jpg', token: 'tk', signed_url: 'https://x/u' };
const FILE: ChannelSlotAsk['file'] = { mime: 'image/jpeg', name: 'page.jpg', size: 2048 };

const WRITERS: readonly [string, (client: ApiClient) => ChannelWriteCalls, string][] = [
  ['teacher', teacherChannelWrites, `/teachers/me/channels/${STUDENT}`],
  ['family', portalChannelWrites, `/portal/students/${STUDENT}/channel`],
  ['assistant', salesChannelWrites, `/sales/students/${STUDENT}/channel`],
];

describe.each(WRITERS)('the %s chat writes (docs/31 §2)', (_who, writesOf, chat) => {
  it('sends a message and answers the stored one', async () => {
    const { client, apiSend } = clientAnswering(message);
    const post = { body: 'السلام عليكم', client_id: MESSAGE };
    await expect(writesOf(client).post({ studentId: STUDENT, post })).resolves.toMatchObject({
      id: MESSAGE,
    });
    expect(apiSend).toHaveBeenCalledWith('POST', `${chat}/messages`, post);
  });

  it('marks the chat read up to a message and answers nothing (204)', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await expect(
      writesOf(client).read({ studentId: STUDENT, at: BEFORE }),
    ).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenCalledWith('POST', `${chat}/read`, { at: BEFORE });
  });

  it('asks a file slot and edits a text', async () => {
    const { client, apiSend } = clientAnswering(SLOT);
    const writes = writesOf(client);
    await expect(writes.upload({ studentId: STUDENT, file: FILE })).resolves.toEqual(SLOT);
    apiSend.mockResolvedValueOnce({ ...message, edited: true });
    await writes.edit({ studentId: STUDENT, messageId: MESSAGE, body: 'نص' });
    expect(apiSend.mock.calls).toEqual([
      ['POST', `${chat}/attachments/upload-url`, FILE],
      ['PATCH', `${chat}/messages/${MESSAGE}`, { body: 'نص' }],
    ]);
  });

  it('throws bad_response on a stored message the schema refuses', async () => {
    const { client } = clientAnswering({ ...message, mine: 'yes' });
    const failure = await writesOf(client)
      .post({ studentId: STUDENT, post: { body: 'x' } })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});

describe('channelWritesByAudience', () => {
  it.each([
    ['teacher', `/teachers/me/channels/${STUDENT}/read`],
    ['portal', `/portal/students/${STUDENT}/channel/read`],
    ['sales', `/sales/students/${STUDENT}/channel/read`],
  ] as const)('marks the %s chat read at its own route', async (audience, path) => {
    const { client, apiSend } = clientAnswering(undefined);
    const writes = channelWritesByAudience(client)[channelWriterOf(audience)];
    await writes.read({ studentId: STUDENT, at: BEFORE });
    expect(apiSend).toHaveBeenCalledWith('POST', path, { at: BEFORE });
  });

  it('the monitor has no writer routes', () => {
    expect(() => channelWriterOf('admin')).toThrow();
  });
});
