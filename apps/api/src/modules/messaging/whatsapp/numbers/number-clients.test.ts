import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { NumberClients } from './number-clients';
import { N1, N2, overlayNum } from './number-route.fakes';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// docs/23c: one client per number, from that number's own config only; nothing here reaches a network.

const install = (numbers = [overlayNum()]) => setNumbersOverlay({ values: {}, numberIds: {}, numbers });

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('NumberClients', () => {
  it('legacy (no overlay) and unknown numbers have no client', () => {
    expect(new NumberClients().client(N1)).toBeNull();
    install();
    expect(new NumberClients().client(N2)).toBeNull();
  });

  it('a disabled number, or one without a working config of its own, has no client', () => {
    install([overlayNum({ enabled: false }), overlayNum({ id: N2, env: null })]);
    const c = new NumberClients();
    expect(c.client(N1)).toBeNull();
    expect(c.client(N2)).toBeNull();
  });

  it('cached while the number\'s config is unchanged; a new token builds a new client', () => {
    install();
    const c = new NumberClients();
    const first = c.client(N1);
    expect(first?.configured()).toBe(true);
    expect(c.client(N1)).toBe(first);
    install([overlayNum({ env: { ...STUB_ENV, accessToken: 'rotated' } })]);
    expect(c.client(N1)).not.toBe(first);
  });

  it('each number gets its own client', () => {
    install([overlayNum(), overlayNum({ id: N2, is_default: false })]);
    const c = new NumberClients();
    expect(c.client(N1)).not.toBe(c.client(N2));
  });
});
