import { GATE_CONFIRM_TEXT, SETTING_DEFAULTS } from '@ab/settings';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { sendGateCalls } from '../send-gate-api';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('send gate calls', () => {
  it('turns sending on with the confirmation text and answers the settings', async () => {
    const { client, apiSend } = clientAnswering(SETTING_DEFAULTS);
    const body = { on: true, confirmText: GATE_CONFIRM_TEXT.sending };
    await expect(sendGateCalls(client).sending(body)).resolves.toEqual(SETTING_DEFAULTS);
    expect(apiSend.mock.calls).toEqual([['PUT', '/messages/gate/sending', body]]);
  });

  it('turns automatic messages off with no text', async () => {
    const { client, apiSend } = clientAnswering(SETTING_DEFAULTS);
    await sendGateCalls(client).auto({ on: false });
    expect(apiSend.mock.calls).toEqual([['PUT', '/messages/gate/auto', { on: false }]]);
  });

  it('ticks the cut-over with the done flag as the body', async () => {
    const { client, apiSend } = clientAnswering(SETTING_DEFAULTS);
    await sendGateCalls(client).cutover(true);
    expect(apiSend.mock.calls).toEqual([['PUT', '/messages/gate/cutover', { done: true }]]);
  });

  it('refuses an answer that is not the settings', async () => {
    const { client } = clientAnswering({ messaging_enabled: 'yes' });
    await expect(sendGateCalls(client).cutover(false)).rejects.toBeInstanceOf(ApiError);
  });
});
