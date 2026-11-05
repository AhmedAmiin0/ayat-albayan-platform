import { describe, expect, it, vi } from 'vitest';
import { lineSaved, onLineSaved, savedLines, savedNumber } from './provider-saved';

// docs/19 «CRM → Meta»: saving a line's provider tells the listeners (one template sync on meta).

describe('savedLines (PUT /settings/integrations)', () => {
  it('each provider key saved, by line; a cleared or unknown value is not a save', () => {
    expect(savedLines({ WA_PROVIDER: 'meta', WA_CHAT_PROVIDER: 'kapso', WA_WABA_ID: 'x' })).toEqual([
      { line: 'notifications', provider: 'meta' },
      { line: 'chat', provider: 'kapso' },
    ]);
    expect(savedLines({ WA_PROVIDER: null, WA_CHAT_PROVIDER: 'other' })).toEqual([]);
  });
});

describe('savedNumber («الأرقام»)', () => {
  const row = { purpose: 'notifications', provider: 'meta', enabled: true, is_default: true };

  it('a role\'s default enabled number, created or updated', () => {
    expect(savedNumber({ action: 'update', after: row })).toEqual({ line: 'notifications', provider: 'meta' });
    expect(savedNumber({ action: 'create', after: { ...row, purpose: 'chat', provider: 'crm' } })).toEqual({ line: 'chat', provider: 'crm' });
  });

  it('nothing for another number or write: not the default, off, a calls number, a secret, a delete', () => {
    expect(savedNumber({ action: 'update', after: { ...row, is_default: false } })).toBeNull();
    expect(savedNumber({ action: 'update', after: { ...row, enabled: false } })).toBeNull();
    expect(savedNumber({ action: 'update', after: { ...row, purpose: 'calls' } })).toBeNull();
    expect(savedNumber({ action: 'secret_set', after: { name: 'access_token' } })).toBeNull();
    expect(savedNumber({ action: 'delete', after: row })).toBeNull();
  });
});

describe('lineSaved', () => {
  it('calls every listener in the background; a failing one only logs; unsubscribe stops it', async () => {
    const ok = vi.fn(async () => undefined);
    const bad = vi.fn(async () => Promise.reject(new Error('boom')));
    const offOk = onLineSaved(ok);
    const offBad = onLineSaved(bad);
    expect(() => lineSaved({ line: 'notifications', provider: 'meta' })).not.toThrow();
    await Promise.resolve();
    expect(ok).toHaveBeenCalledWith({ line: 'notifications', provider: 'meta' });
    expect(bad).toHaveBeenCalledTimes(1);
    offOk();
    offBad();
    lineSaved({ line: 'chat', provider: 'meta' });
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
