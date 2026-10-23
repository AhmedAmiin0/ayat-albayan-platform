import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { CommunicationsService } from './communications.service';
import type { NumbersConfig } from './numbers.config';
import type { NumbersSettings } from './numbers.settings';

// The read switch (docs/23 §2e step 5): module refused while parity differs; legacy always allowed.
function setup(opts: { source: 'legacy' | 'module'; moduleValues: Record<string, string> }) {
  let source = opts.source;
  const settings = { writeSource: vi.fn(async (s: 'legacy' | 'module') => void (source = s)) };
  const config = {
    source: vi.fn(async () => source),
    defaults: vi.fn(async () => []),
    overlayOf: vi.fn(() => ({ values: opts.moduleValues, numberIds: {} })),
    reload: vi.fn(async () => true),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const svc = new CommunicationsService(settings as unknown as NumbersSettings, config as unknown as NumbersConfig, audit as unknown as AuditService);
  return { svc, settings, config, audit };
}

/** The test env has no WhatsApp line: a module side that adds one differs; an empty one does not. */
const DIFFERENT = { WA_PHONE_NUMBER_ID: '1000000001' };

describe('POST /admin/communications/source', () => {
  it('refuses module with 409 parity_not_empty while parity is non-empty, and writes nothing', async () => {
    const t = setup({ source: 'legacy', moduleValues: DIFFERENT });
    await expect(t.svc.setSource('module', 'actor')).rejects.toMatchObject({ status: 409, response: { message: 'parity_not_empty' } });
    expect(t.settings.writeSource).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('flips to module when parity is empty: writes comms_source only, refreshes, audits', async () => {
    const t = setup({ source: 'legacy', moduleValues: {} });
    expect(await t.svc.setSource('module', 'actor')).toEqual({ source: 'module' });
    expect(t.settings.writeSource).toHaveBeenCalledWith('module', 'actor');
    expect(t.config.reload).toHaveBeenCalled();
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'comms_source', before: { comms_source: 'legacy' }, after: { comms_source: 'module' } }));
  });

  it('back to legacy is always allowed, even with differences', async () => {
    const t = setup({ source: 'module', moduleValues: DIFFERENT });
    expect(await t.svc.setSource('legacy', 'actor')).toEqual({ source: 'legacy' });
    expect(t.settings.writeSource).toHaveBeenCalledWith('legacy', 'actor');
  });

  it('the same source again is a no-op (no write, no audit)', async () => {
    const t = setup({ source: 'legacy', moduleValues: {} });
    await t.svc.setSource('legacy', 'actor');
    expect(t.settings.writeSource).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('parity lists the differences and the current source', async () => {
    const t = setup({ source: 'legacy', moduleValues: DIFFERENT });
    const view = await t.svc.parity();
    expect(view.source).toBe('legacy');
    expect(view.differences).toEqual([{ role: 'notifications', field: 'webhook_phone_number_id', state: 'missing' }]);
  });
});
