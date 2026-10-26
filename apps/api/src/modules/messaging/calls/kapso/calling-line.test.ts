import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../../../common/integrations/numbers-overlay';

import { callingLine } from './calling-line';

const { lineEnvs } = vi.hoisted(() => ({ lineEnvs: vi.fn() }));
vi.mock('../../../../config/env/env', () => ({ loadEnv: () => ({}), lineEnvs: () => lineEnvs() }));

const kapso = { provider: 'kapso', base: 'http://stub', version: 'v24.0', phoneNumberId: 'chat-pn', wabaId: 'w', apiKey: 'k' };

afterEach(() => setNumbersOverlay(null));

describe('callingLine (docs/28: the chat line on Kapso only)', () => {
  it('the chat line on Kapso calls; meta, crm or no chat line cannot', () => {
    lineEnvs.mockReturnValue({ notifications: null, chat: kapso });
    expect(callingLine()).toEqual({ env: kapso, numberId: null });
    lineEnvs.mockReturnValue({ notifications: kapso, chat: { ...kapso, provider: 'meta', accessToken: 't' } });
    expect(callingLine()).toBeNull();
    lineEnvs.mockReturnValue({ notifications: kapso, chat: { provider: 'crm', base: 'x', apiKey: 'k' } });
    expect(callingLine()).toBeNull();
    lineEnvs.mockReturnValue({ notifications: kapso, chat: null });
    expect(callingLine()).toBeNull();
  });

  it('module mode stamps the chat number\'s id', () => {
    lineEnvs.mockReturnValue({ notifications: null, chat: kapso });
    setNumbersOverlay({ values: {}, numberIds: { chat: 'n-chat' } });
    expect(callingLine()?.numberId).toBe('n-chat');
  });
});
