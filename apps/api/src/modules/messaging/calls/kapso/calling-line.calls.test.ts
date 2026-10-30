import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCallsPhoneId, setCallsNumber } from '../../../../common/integrations/calls-number';
import { setNumbersOverlay } from '../../../../common/integrations/numbers-overlay';
import { callingLine } from './calling-line';

const { lineEnvs } = vi.hoisted(() => ({ lineEnvs: vi.fn() }));
vi.mock('../../../../config/env/env', () => ({ loadEnv: () => ({}), lineEnvs: () => lineEnvs() }));

const kapso = { provider: 'kapso' as const, base: 'http://stub', version: 'v24.0', phoneNumberId: 'chat-pn', wabaId: 'w', apiKey: 'k' };
const callsEnv = { ...kapso, phoneNumberId: 'calls-pn' };

afterEach(() => {
  setCallsNumber(null);
  setNumbersOverlay(null);
});

describe('callingLine with a dedicated calls number (docs/28 §10)', () => {
  it('rings the enabled default calls number and stamps its id, whatever the chat line is', () => {
    lineEnvs.mockReturnValue({ notifications: null, chat: kapso });
    setNumbersOverlay({ values: {}, numberIds: { chat: 'n-chat' } });
    setCallsNumber({ id: 'n-calls', phoneNumberId: 'calls-pn', env: callsEnv });
    expect(callingLine()).toEqual({ env: callsEnv, numberId: 'n-calls', calls: true });
    lineEnvs.mockReturnValue({ notifications: null, chat: null });
    expect(callingLine()?.numberId).toBe('n-calls');
  });

  it('no calls number: the chat line exactly as before (no behaviour change)', () => {
    lineEnvs.mockReturnValue({ notifications: null, chat: kapso });
    expect(callingLine()).toEqual({ env: kapso, numberId: null });
  });

  it('a calls number that cannot carry a call is unavailable, never a silent fall back to chat', () => {
    lineEnvs.mockReturnValue({ notifications: null, chat: kapso });
    setCallsNumber({ id: 'n-calls', phoneNumberId: 'calls-pn', env: null });
    expect(callingLine()).toBeNull();
  });

  it('isCallsPhoneId names the calls number only', () => {
    expect(isCallsPhoneId('calls-pn')).toBe(false);
    setCallsNumber({ id: 'n-calls', phoneNumberId: 'calls-pn', env: callsEnv });
    expect([isCallsPhoneId('calls-pn'), isCallsPhoneId('chat-pn'), isCallsPhoneId(null)]).toEqual([true, false, false]);
  });
});
