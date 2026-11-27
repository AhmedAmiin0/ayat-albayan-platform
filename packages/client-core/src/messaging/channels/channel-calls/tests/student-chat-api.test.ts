import { describe, expect, it } from 'vitest';
import { monitorChannelCalls, portalChannelCalls, salesChannelCalls, type ChannelCalls } from '..';
import type { ApiClient } from '../../../../core/http';
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

const AUDIENCES: readonly [string, (client: ApiClient) => ChannelCalls, string][] = [
  ['family', portalChannelCalls, `/portal/students/${STUDENT}/channel`],
  ['assistant', salesChannelCalls, `/sales/students/${STUDENT}/channel`],
  ['monitor', monitorChannelCalls, `/students/${STUDENT}/channel`],
];

describe.each(AUDIENCES)('the %s chat calls (docs/31 §2)', (_who, callsOf, chat) => {
  it('reads a page at its own chat path, older pages by cursor', async () => {
    const { client, apiFetch } = clientAnswering(page);
    const calls = callsOf(client);
    await expect(calls.page({ studentId: STUDENT })).resolves.toEqual(page);
    await calls.page({ studentId: STUDENT, before: BEFORE });
    expect(apiFetch.mock.calls).toEqual([
      [`${chat}/messages`],
      [`${chat}/messages?before=${encodeURIComponent(BEFORE)}`],
    ]);
  });

  it('reads the presence and the read info, and deletes for everyone', async () => {
    const { client, apiFetch, apiSend } = clientAnswering(presence);
    const calls = callsOf(client);
    await calls.presence(STUDENT);
    apiFetch.mockResolvedValueOnce(reads);
    await expect(calls.reads({ studentId: STUDENT, messageId: MESSAGE })).resolves.toEqual(reads);
    apiSend.mockResolvedValueOnce(message);
    await expect(calls.remove({ studentId: STUDENT, messageId: MESSAGE })).resolves.toMatchObject({
      id: MESSAGE,
    });
    expect(apiFetch).toHaveBeenCalledWith(`${chat}/presence`);
    expect(apiFetch).toHaveBeenCalledWith(`${chat}/messages/${MESSAGE}/reads`);
    expect(apiSend).toHaveBeenCalledWith('DELETE', `${chat}/messages/${MESSAGE}`, undefined);
  });

  it("reads the newest page for an empty cursor (an infinite query's first page)", async () => {
    const { client, apiFetch } = clientAnswering(page);
    await callsOf(client).page({ studentId: STUDENT, before: '' });
    expect(apiFetch).toHaveBeenCalledWith(`${chat}/messages`);
  });
});
