import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { STUB_WA_ENV } from '@/modules/messaging/whatsapp/gate/send-gate.fakes';
import { pooledKeys } from './pooled';

const number = (over: Partial<OverlayNumber>): OverlayNumber => ({ id: 'n1', purpose: 'notifications', env: null, ...over }) as OverlayNumber;

afterEach(() => vi.unstubAllEnvs());

describe('pooledKeys (docs/42 42-7)', () => {
  it('legacy: the notifications line on Meta may pool; the chat line never', () => {
    Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
    expect(pooledKeys(null)).toEqual(new Set(['notifications']));
  });

  it('module mode: notifications numbers on meta / kapso only (never Evolution, chat or crm)', () => {
    const numbers = [
      number({ id: 'meta', env: { provider: 'meta' } as OverlayNumber['env'] }),
      number({ id: 'kapso', env: { provider: 'kapso' } as OverlayNumber['env'] }),
      number({ id: 'evo', env: { provider: 'evolution' } as OverlayNumber['env'] }),
      number({ id: 'crm', env: { provider: 'crm' } as OverlayNumber['env'] }),
      number({ id: 'chat', purpose: 'chat', env: { provider: 'kapso' } as OverlayNumber['env'] }),
      number({ id: 'off' }),
    ];
    expect(pooledKeys(numbers)).toEqual(new Set(['meta', 'kapso']));
  });
});
