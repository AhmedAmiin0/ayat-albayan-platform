import { describe, expect, it } from 'vitest';
import { settingsUpdateSchema } from './schema.js';
import { readSettings } from './validate.js';
import { SETTING_DEFAULTS, SETTINGS_REGISTRY } from './registry.js';

// comms_source (docs/23 §3 phase 3): a registry row only its own guarded endpoint writes.
describe('comms_source setting', () => {
  it('defaults to legacy; a missing, unknown or malformed row reads as legacy', () => {
    expect(SETTING_DEFAULTS.comms_source).toBe('legacy');
    expect(readSettings([]).comms_source).toBe('legacy');
    for (const value of ['env', 'MODULE', 1, null, { source: 'module' }]) {
      expect(readSettings([{ key: 'comms_source', value }]).comms_source).toBe('legacy');
    }
    expect(readSettings([{ key: 'comms_source', value: 'module' }]).comms_source).toBe('module');
  });

  it('PATCH /settings never carries it (patch: false), other fields still pass', () => {
    expect(SETTINGS_REGISTRY.comms_source.patch).toBe(false);
    const parsed = settingsUpdateSchema.parse({ commsSource: 'module', quickReplyWindowHours: 24 });
    expect(parsed).toEqual({ quickReplyWindowHours: 24 });
  });

  it('is shown by its own control, not the generic form', () => {
    expect(SETTINGS_REGISTRY.comms_source.form).toBe(false);
  });
});
