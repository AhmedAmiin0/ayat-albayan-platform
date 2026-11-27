import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../../core/http';
import { teacherChannelCalls } from '..';
import {
  BEFORE,
  clientAnswering,
  MESSAGE,
  message,
  page,
  presence,
  reads,
  STUDENT,
} from './answers.test-util';

const CHAT = `/teachers/me/channels/${STUDENT}`;

describe('teacherChannelCalls (docs/31 §2)', () => {
  it('reads the list of chats', async () => {
    const row = {
      student_id: STUDENT,
      student_name: 'سالم',
      student_code: 'AB-0001',
      last_message: null,
      unread: 2,
    };
    const { client, apiFetch } = clientAnswering([row]);
    await expect(teacherChannelCalls(client).list()).resolves.toEqual([row]);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/channels');
  });

  it('reads the newest page with no cursor, then an older one', async () => {
    const { client, apiFetch } = clientAnswering(page);
    const calls = teacherChannelCalls(client);
    await calls.page({ studentId: STUDENT });
    await calls.page({ studentId: STUDENT, before: BEFORE });
    expect(apiFetch.mock.calls).toEqual([
      [`${CHAT}/messages`],
      [`${CHAT}/messages?before=${encodeURIComponent(BEFORE)}`],
    ]);
  });

  it('reads the presence, the read info, and deletes for everyone', async () => {
    const { client, apiFetch, apiSend } = clientAnswering(presence);
    const calls = teacherChannelCalls(client);
    await expect(calls.presence(STUDENT)).resolves.toEqual(presence);
    apiFetch.mockResolvedValueOnce(reads);
    await expect(calls.reads({ studentId: STUDENT, messageId: MESSAGE })).resolves.toEqual(reads);
    apiSend.mockResolvedValueOnce(message);
    await calls.remove({ studentId: STUDENT, messageId: MESSAGE });
    expect(apiFetch).toHaveBeenCalledWith(`${CHAT}/presence`);
    expect(apiFetch).toHaveBeenCalledWith(`${CHAT}/messages/${MESSAGE}/reads`);
    expect(apiSend).toHaveBeenCalledWith('DELETE', `${CHAT}/messages/${MESSAGE}`, undefined);
  });

  it('throws bad_response on a page the schema refuses', async () => {
    const { client } = clientAnswering({ ...page, has_more: 'yes' });
    const failure = await teacherChannelCalls(client)
      .page({ studentId: STUDENT })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
