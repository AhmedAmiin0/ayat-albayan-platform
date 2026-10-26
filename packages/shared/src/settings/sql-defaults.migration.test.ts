import { describe, expect, it } from 'vitest';
import { GOOGLE_SEED_DEFS } from './google-defs.js';
import { SEED_ENTRIES } from './seed/seed-entries.js';
import { liveSqlObjects, sqlSettingsReaders } from './seed/sql-readers.js';

// Vite's raw import (vitest): the shared lib has no Node typings, so the migrations are read this way.
declare global {
  interface ImportMeta {
    glob<T>(pattern: string | string[], options: { query: '?raw'; import: 'default'; eager: true }): Record<string, T>;
  }
}

const MIGRATIONS = import.meta.glob<string>('../../../db/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const live = liveSqlObjects(MIGRATIONS);

/**
 * docs/26 §2b: a key read by SQL keeps its own fallback, and that fallback must equal the registry
 * default. Each reader has its own shape, so each is pinned by a targeted regex over its LIVE body
 * (the last `create or replace` wins). `$1` is the SQL default, parsed by `parse`.
 */
interface Pin {
  fn: string;
  key: string;
  re: RegExp;
  parse: (s: string) => unknown;
}
const bool = (s: string): boolean => s === 'true';
const PINS: Pin[] = [
  { fn: 'public.prune_activity_log', key: 'activity_retention_days', re: /days int := (\d+);/, parse: Number },
  ...(['payout_count_late', 'payout_count_no_show', 'payout_count_trials'] as const).map((key) => ({
    fn: 'public.lesson_counts_for_pay',
    key,
    re: new RegExp(`coalesce\\(bool_or\\(key = '${key}' and value = 'true'::jsonb\\), (true|false)\\)`),
    parse: bool,
  })),
  { fn: 'public.v_student_list', key: 'renewal_alert_remaining', re: /where key = 'renewal_alert_remaining'\), (\d+)\)/, parse: Number },
  { fn: 'public.set_assistant_terms', key: 'academy_timezone', re: /s\.key = 'academy_timezone'\), '([^']+)'\)/, parse: String },
  { fn: 'public.google_sync_on', key: 'google_sync_enabled', re: /s\.key = 'google_sync_enabled'\), (true|false)\)/, parse: bool },
  {
    fn: 'public.google_sync_window_days',
    key: 'google_calendar_window_days',
    re: /s\.key = 'google_calendar_window_days' and jsonb_typeof\(s\.value\) = 'number'\), (\d+)\)/,
    parse: Number,
  },
  {
    fn: 'public.renewal_commission_share',
    key: 'renewal_commission_percent',
    re: /s\.key = 'renewal_commission_percent' and jsonb_typeof\(s\.value\) = 'number'\), (\d+)\)/,
    parse: Number,
  },
];

/** Known differences today: none. Add `'fn:key'` here (with a comment and a follow-up) rather than changing SQL in a test PR. */
const EXPECTED_MISMATCHES: ReadonlySet<string> = new Set<string>();

const entry = (key: string) => SEED_ENTRIES.find((e) => e.key === key);

describe('SQL coalesce defaults = registry defaults (sql-defaults.migration)', () => {
  it('every key a live SQL reader names has a pin', () => {
    const pinned = new Set(PINS.map((p) => `${p.fn}:${p.key}`));
    const named = [...sqlSettingsReaders(MIGRATIONS)].flatMap(([fn, keys]) => keys.map((k) => `${fn}:${k}`));
    expect(named.filter((n) => !pinned.has(n))).toEqual([]);
  });

  it.each(PINS.map((p) => [`${p.fn}:${p.key}`, p] as const))('%s', (id, pin) => {
    const body = live.get(pin.fn)?.body ?? '';
    const hit = pin.re.exec(body);
    expect([id, hit !== null]).toEqual([id, true]);
    const sqlDefault = pin.parse(hit?.[1] ?? '');
    const registryDefault = entry(pin.key)?.default_value;
    if (EXPECTED_MISMATCHES.has(id)) expect(sqlDefault).not.toEqual(registryDefault);
    else expect(sqlDefault).toEqual(registryDefault);
  });

  it('google_sync_window_days clamps to the seed bounds (7..180)', () => {
    const body = live.get('public.google_sync_window_days')?.body ?? '';
    const m = /least\(greatest\(\(s\.value #>> '\{\}'\)::int, (\d+)\), (\d+)\)/.exec(body);
    const { min, max } = GOOGLE_SEED_DEFS.google_calendar_window_days;
    expect(m?.slice(1, 3).map(Number)).toEqual([min, max]);
    expect(entry('google_calendar_window_days')).toMatchObject({ value_type: 'int', default_value: 60 });
  });

  it('prune_activity_log keeps its own fallback when the stored value is not a 1–4 digit number', () => {
    expect(live.get('public.prune_activity_log')?.body).toContain("~ '^[1-9][0-9]{0,3}$'");
  });
});
