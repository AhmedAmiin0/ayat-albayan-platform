import { describe, expect, it } from 'vitest';
import { OWNED_SETTING_KEYS, SETTINGS_REGISTRY } from '../settings/index.js';
import { RULE_SETTING_KEYS } from './rules.legacy.js';

// docs/23b decision 1: the 8 keys move to «الإشعارات» in the registry AND in OWNED_SETTING_KEYS.
describe('the notification rules own exactly RULE_SETTING_KEYS', () => {
  it('OWNED_SETTING_KEYS names them notifications, and nothing else', () => {
    const owned = Object.entries(OWNED_SETTING_KEYS).filter(([, o]) => o === 'notifications').map(([k]) => k);
    expect(owned.sort()).toEqual([...RULE_SETTING_KEYS].sort());
  });

  it('their registry defs say ownedBy notifications', () => {
    for (const k of RULE_SETTING_KEYS) expect([k, (SETTINGS_REGISTRY[k] as { ownedBy?: string }).ownedBy]).toEqual([k, 'notifications']);
  });

  it('renewal_alert_remaining stays CONFIG (docs/26 §1)', () => {
    expect(Object.hasOwn(OWNED_SETTING_KEYS, 'renewal_alert_remaining')).toBe(false);
  });
});
