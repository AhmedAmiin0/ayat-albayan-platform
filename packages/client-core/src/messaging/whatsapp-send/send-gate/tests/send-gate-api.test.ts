import { GATE_CONFIRM_TEXT, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { sendGateCalls } from '../send-gate-api';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('send gate calls', () => {
  it('turns a switch on with its confirmation text and answers the settings', async () => {
    const { client, apiSend } = clientAnswering(SETTING_DEFAULTS);
    const calls = sendGateCalls(client);
    const on = { on: true, confirmText: GATE_CONFIRM_TEXT.sending };
    await expect(calls.sending(on)).resolves.toEqual(SETTING_DEFAULTS);
    expect(apiSend.mock.calls).toEqual([
      ['PUT', '/messages/gate/sending', { on: true, confirmText: GATE_CONFIRM_TEXT.sending }],
    ]);
  });

  it('sends automatic messages off and the cut-over tick on their own paths', async () => {
    const { client, apiSend } = clientAnswering(SETTING_DEFAULTS);
    const calls = sendGateCalls(client);
    await calls.auto({ on: false });
    await calls.cutover({ done: true });
    expect(apiSend.mock.calls).toEqual([
      ['PUT', '/messages/gate/auto', { on: false }],
      ['PUT', '/messages/gate/cutover', { done: true }],
    ]);
  });

  it('refuses an answer that is not the full settings', async () => {
    const { client } = clientAnswering({ messaging_enabled: true });
    await expect(sendGateCalls(client).sending({ on: false })).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
