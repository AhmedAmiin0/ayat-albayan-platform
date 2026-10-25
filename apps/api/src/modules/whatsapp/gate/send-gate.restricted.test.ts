import { afterEach, describe, expect, it, vi } from 'vitest';
import { STUB_WA_ENV, fakeGate, rows } from './send-gate.fakes';

const gate = (stored: Record<string, unknown> = {}) => fakeGate([rows(stored)], 3).gate;

describe('SendGate.view restricted flag (WA_ALLOWED_RECIPIENTS, docs/12 §13.5)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('restricted: true when the allow-list is set (read at construction)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+20 100 123 4567, 966551234567');
    await expect(gate().view()).resolves.toEqual({ open: false, reason: 'not_configured', queued: 3, restricted: true });
  });

  it('the key is ABSENT when the list is unset or blank (exact-shape asserts hold)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    for (const raw of ['', '   ']) {
      vi.stubEnv('WA_ALLOWED_RECIPIENTS', raw);
      const view = await gate().view();
      expect(view).toEqual({ open: false, reason: 'not_configured', queued: 3 });
      expect(Object.keys(view)).not.toContain('restricted');
    }
  });

  it('an open gate keeps its state and adds the flag', async () => {
    Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+201001234567');
    await expect(gate({ messaging_enabled: true }).view()).resolves.toEqual({ open: true, reason: null, queued: 3, restricted: true });
  });
});
