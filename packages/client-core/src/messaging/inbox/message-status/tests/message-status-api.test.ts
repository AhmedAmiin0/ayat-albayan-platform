import { aMessageView } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { messageStatusCalls } from '../message-status-api';

const ROW = aMessageView({ status: 'failed' });

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('message status calls', () => {
  it('reads the send gate on the path of today', async () => {
    const gate = { open: false, reason: 'switch_off', queued: 2 };
    const { client, apiFetch } = clientAnswering(gate);
    await expect(messageStatusCalls(client).gate()).resolves.toEqual(gate);
    expect(apiFetch.mock.calls).toEqual([['/messages/gate']]);
  });

  it('posts each change of one message with no body and answers the row', async () => {
    const { client, apiSend } = clientAnswering(ROW);
    const calls = messageStatusCalls(client);
    const rows = await Promise.all([
      calls.retry(ROW.id),
      calls.sentManually(ROW.id),
      calls.appSend(ROW.id),
      calls.handOff(ROW.id),
    ]);
    expect(rows).toEqual([ROW, ROW, ROW, ROW]);
    const paths = ['retry', 'sent-manually', 'app-send', 'hand-off'];
    expect(apiSend.mock.calls).toEqual(
      paths.map((p) => ['POST', `/messages/${ROW.id}/${p}`, undefined]),
    );
  });

  it('refuses an answer that is not a message row', async () => {
    const { client } = clientAnswering({ id: ROW.id });
    await expect(messageStatusCalls(client).retry(ROW.id)).rejects.toThrow();
  });
});
