import { GATE_CONFIRM_TEXT, SETTING_DEFAULTS } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendGateChange } from './gate-api';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

afterEach(() => apiSend.mockReset());

describe('sendGateChange: the gate routes (docs/26 §2f, 26-P0)', () => {
  it('sending ON: PUT /messages/gate/sending with the confirmation text; answers the settings', async () => {
    apiSend.mockResolvedValue(SETTING_DEFAULTS);
    await expect(sendGateChange({ sending: true })).resolves.toBe(SETTING_DEFAULTS);
    expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/sending', {
      on: true,
      confirmText: GATE_CONFIRM_TEXT.sending,
    });
  });

  it('sending OFF: no confirmation text at all', async () => {
    await sendGateChange({ sending: false });
    expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/sending', { on: false });
  });

  it('automatic messages: ON with its own text, OFF without', async () => {
    await sendGateChange({ auto: true });
    expect(apiSend).toHaveBeenLastCalledWith('PUT', '/messages/gate/auto', { on: true, confirmText: GATE_CONFIRM_TEXT.auto });
    await sendGateChange({ auto: false });
    expect(apiSend).toHaveBeenLastCalledWith('PUT', '/messages/gate/auto', { on: false });
  });

  it('the CRM cut-over tick: PUT /messages/gate/cutover {done}, both ways', async () => {
    await sendGateChange({ cutover: true });
    expect(apiSend).toHaveBeenLastCalledWith('PUT', '/messages/gate/cutover', { done: true });
    await sendGateChange({ cutover: false });
    expect(apiSend).toHaveBeenLastCalledWith('PUT', '/messages/gate/cutover', { done: false });
    expect(apiSend).not.toHaveBeenCalledWith('PATCH', expect.anything(), expect.anything());
  });
});

describe('GATE_CONFIRM_TEXT (pinned to the words the dialog shows)', () => {
  it('equals ar.json templates.settings.enableYes / autoEnableYes', () => {
    expect(GATE_CONFIRM_TEXT.sending).toBe(ar.templates.settings.enableYes);
    expect(GATE_CONFIRM_TEXT.auto).toBe(ar.templates.settings.autoEnableYes);
  });
});
