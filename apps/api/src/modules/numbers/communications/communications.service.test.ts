import type { RuleParityDiff } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { CommunicationsDeps } from './communications.deps';
import { CommunicationsService } from './communications.service';
import type { NumbersConfig } from '../config/numbers.config';
import type { NumbersSettings } from '../numbers.settings';

// The read switch (docs/23 §2e step 5, docs/23b decision 5): module refused while the numbers or the
// rules parity differs; legacy always allowed, after copying the rules into the legacy keys.
function setup(opts: { source: 'legacy' | 'module'; moduleValues: Record<string, string>; rules?: RuleParityDiff[] }) {
  let source = opts.source;
  const order: string[] = [];
  const settings = {
    writeSource: vi.fn(async (s: 'legacy' | 'module') => {
      order.push(`source:${s}`);
      source = s;
    }),
  };
  const config = {
    source: vi.fn(async () => source),
    defaults: vi.fn(async () => []),
    overlayOf: vi.fn(() => ({ values: opts.moduleValues, numberIds: {} })),
    reload: vi.fn(async () => true),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const rules = {
    differences: vi.fn(async () => opts.rules ?? []),
    copyToLegacy: vi.fn(async () => {
      order.push('copy');
      return { reminder_minutes_before: 30 };
    }),
    invalidate: vi.fn(),
  };
  const deps = { audit, rules } as unknown as CommunicationsDeps;
  const svc = new CommunicationsService(settings as unknown as NumbersSettings, config as unknown as NumbersConfig, deps);
  return { svc, settings, config, audit, rules, order };
}

/** The test env has no WhatsApp line: a module side that adds one differs; an empty one does not. */
const DIFFERENT = { WA_PHONE_NUMBER_ID: '1000000001' };
const RULE_DIFF: RuleParityDiff = { key: 'lesson_reminder', field: 'timing', legacy: '{"minutes_before":60}', module: '{"minutes_before":30}' };

describe('POST /admin/communications/source', () => {
  it('refuses module with 409 parity_not_empty while the numbers parity is non-empty, and writes nothing', async () => {
    const t = setup({ source: 'legacy', moduleValues: DIFFERENT });
    await expect(t.svc.setSource('module', 'actor')).rejects.toMatchObject({ status: 409, response: { message: 'parity_not_empty' } });
    expect(t.settings.writeSource).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('refuses module while only the rules parity differs', async () => {
    const t = setup({ source: 'legacy', moduleValues: {}, rules: [RULE_DIFF] });
    await expect(t.svc.setSource('module', 'actor')).rejects.toMatchObject({ status: 409, response: { message: 'parity_not_empty' } });
    expect(t.settings.writeSource).not.toHaveBeenCalled();
  });

  it('flips to module when both parities are empty: writes comms_source only, refreshes, audits', async () => {
    const t = setup({ source: 'legacy', moduleValues: {} });
    expect(await t.svc.setSource('module', 'actor')).toEqual({ source: 'module' });
    expect(t.settings.writeSource).toHaveBeenCalledWith('module', 'actor');
    expect(t.rules.copyToLegacy).not.toHaveBeenCalled();
    expect(t.config.reload).toHaveBeenCalled();
    expect(t.rules.invalidate).toHaveBeenCalled();
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'comms_source', before: { comms_source: 'legacy' }, after: { comms_source: 'module' } }));
  });

  it('back to legacy is always allowed: first copies the rules into the legacy keys, then flips', async () => {
    const t = setup({ source: 'module', moduleValues: DIFFERENT, rules: [RULE_DIFF] });
    expect(await t.svc.setSource('legacy', 'actor')).toEqual({ source: 'legacy' });
    expect(t.order).toEqual(['copy', 'source:legacy', 'copy']);
    expect(t.rules.copyToLegacy).toHaveBeenCalledWith('actor');
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });

  it('a rule PATCH between the first copy and the flip still reaches the legacy keys (copied again after)', async () => {
    const t = setup({ source: 'module', moduleValues: {} });
    const legacy: Record<string, number> = {};
    let rule = 30;
    t.rules.copyToLegacy.mockImplementation(async () => {
      legacy['reminder_minutes_before'] = rule;
      rule = 45; // the PATCH lands right after the first copy, still in module mode
      return { reminder_minutes_before: legacy['reminder_minutes_before'] };
    });
    await t.svc.setSource('legacy', 'actor');
    expect(legacy).toEqual({ reminder_minutes_before: 45 });
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });

  it('a failed second copy is still audited once (the flip happened) and surfaces the error', async () => {
    const t = setup({ source: 'module', moduleValues: {} });
    t.rules.copyToLegacy.mockResolvedValueOnce({ reminder_minutes_before: 30 }).mockRejectedValueOnce(new Error('settings write failed'));
    await expect(t.svc.setSource('legacy', 'actor')).rejects.toThrow('settings write failed');
    expect(t.settings.writeSource).toHaveBeenCalledWith('legacy', 'actor');
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });

  it('a failed copy keeps module mode (no flip)', async () => {
    const t = setup({ source: 'module', moduleValues: {} });
    t.rules.copyToLegacy.mockRejectedValueOnce(new Error('settings write failed'));
    await expect(t.svc.setSource('legacy', 'actor')).rejects.toThrow('settings write failed');
    expect(t.settings.writeSource).not.toHaveBeenCalled();
  });

  it('the same source again is a no-op (no write, no copy, no audit)', async () => {
    for (const source of ['legacy', 'module'] as const) {
      const t = setup({ source, moduleValues: DIFFERENT, rules: [RULE_DIFF] });
      expect(await t.svc.setSource(source, 'actor')).toEqual({ source });
      expect(t.settings.writeSource).not.toHaveBeenCalled();
      expect(t.rules.copyToLegacy).not.toHaveBeenCalled();
      expect(t.audit.record).not.toHaveBeenCalled();
    }
  });

  it('parity lists the numbers differences, the rules differences and the current source', async () => {
    const t = setup({ source: 'legacy', moduleValues: DIFFERENT, rules: [RULE_DIFF] });
    const view = await t.svc.parity();
    expect(view.source).toBe('legacy');
    expect(view.differences).toEqual([{ role: 'notifications', field: 'webhook_phone_number_id', state: 'missing' }]);
    expect(view.rules).toEqual([RULE_DIFF]);
  });
});
