import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RULE_LEGACY_MAP, RULE_SETTING_KEYS, SETTING_DEFAULTS, SETTINGS_REGISTRY } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 20261024000631 (docs/23b decision 2) read as text: no database in unit tests. Expand only:
// it creates notification_rules, grants notifications.manage and copies the 6 mapped rows from settings.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const FILE = '20261024000631_notification_rules.sql';
const sql = readFileSync(join(dir, FILE), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('migration 20261024000631: notification_rules', () => {
  it('sorts after 20261023000630 (config expand)', () => {
    expect(FILE > '20261023000630_config_expand.sql').toBe(true);
  });

  it('the table: key format, enabled not null, channels subset, timing size, number_id set null', () => {
    expect(code).toContain("key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$')");
    expect(code).toContain('enabled boolean not null');
    expect(code).toContain("channels <@ array['whatsapp', 'bell', 'push']::text[]");
    expect(code).toContain('octet_length(timing::text) <= 2048');
    expect(code).toContain('number_id uuid references public.wa_numbers (id) on delete set null');
    expect(code).toContain('updated_by uuid references auth.users (id) on delete set null');
  });

  it('RLS: admin read only; anon and authenticated cannot write', () => {
    expect(code).toContain('alter table public.notification_rules enable row level security');
    expect(code).toContain('using (public.is_admin())');
    expect(code).toContain('revoke all on public.notification_rules from anon');
    expect(code).toContain('revoke insert, update, delete, truncate, references, trigger on public.notification_rules from authenticated');
  });

  it('grants notifications.manage to the admin and to every role holding settings.write, idempotently', () => {
    expect(code).toMatch(/'notifications\.manage' from public\.roles r where r\.is_system and r\.key in \('admin'\)\s+on conflict do nothing/);
    expect(code).toMatch(/'notifications\.manage' from public\.role_permissions rp where rp\.permission = 'settings\.write'\s+on conflict do nothing/);
  });

  it('reads settings, never writes it, never calls the config RPCs, never names a send switch', () => {
    expect(code).not.toMatch(/(insert\s+into|update|delete\s+from|merge\s+into|copy)\s+(public\.)?settings\b/i);
    expect(code).not.toMatch(/config_(set|seed)\s*\(/);
    expect(code).not.toMatch(/messaging_enabled|auto_messages_enabled|crm_cutover_done|comms_source|google_sync/);
    expect(code).not.toMatch(/drop table|drop column|alter type/);
    expect(code).not.toContain('renewal_alert_remaining');
  });

  it('copies exactly the RULE_LEGACY_MAP rows, on conflict (key) do nothing', () => {
    const keys = [...code.matchAll(/select '([a-z0-9_]+)', /g)].map((m) => m[1]);
    expect(keys.sort()).toEqual(Object.keys(RULE_LEGACY_MAP).sort());
    expect(code).toMatch(/insert into public\.notification_rules \(key, enabled, timing\)[\s\S]*on conflict \(key\) do nothing;/);
    expect(code).toContain("v.feedback_mode = 'buttons'");
  });

  it('every coalesce default in the copy equals SETTING_DEFAULTS, one per RULE_SETTING_KEYS key', () => {
    const pins = [...code.matchAll(/\), ([^()]+?)\) as ([a-z0-9_]+),?\n/g)].map((m) => [m[2], m[1]] as const);
    expect(pins.map(([k]) => k).sort()).toEqual([...RULE_SETTING_KEYS].sort());
    const parse = (s: string): unknown => (s.startsWith('array[') ? JSON.parse(s.slice(5)) : JSON.parse(s.replace(/^'(.*)'$/, '"$1"')));
    for (const [key, sqlDefault] of pins) expect([key, parse(sqlDefault)]).toEqual([key, SETTING_DEFAULTS[key as (typeof RULE_SETTING_KEYS)[number]]]);
  });

  it('bounds in the copy equal the registry (the same malformed values read as the default)', () => {
    for (const key of ['reminder_minutes_before', 'follow_up_slots_from_hours', 'follow_up_slots_to_days'] as const) {
      const { min, max } = SETTINGS_REGISTRY[key];
      expect(code).toContain(`key = '${key}' and i between ${min} and ${max}`);
    }
    const hours = SETTINGS_REGISTRY.follow_up_hours;
    expect(code).toContain(`having count(*) between 1 and ${hours.maxItems}`);
    expect(code).toContain(`n between ${hours.min} and ${hours.max} and (prev is null or n > prev)`);
    expect(SETTINGS_REGISTRY.feedback_mode.options).toEqual(['buttons', 'link']);
    expect(code).toContain("value #>> '{}' in ('buttons', 'link')");
  });
});
