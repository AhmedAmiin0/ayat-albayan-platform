import { describe, expect, it } from 'vitest';
import { SEED_ENTRIES } from './seed-entries.js';
import { sqlSettingsReaders } from './sql-readers.js';

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
const readers = sqlSettingsReaders(MIGRATIONS);

/**
 * docs/26a Part B §2: the live SQL objects that read public.settings directly (the two payout views
 * and sync_teacher_earning read through lesson_counts_for_pay, so they name no key themselves).
 */
const DOC_READERS = {
  'public.prune_activity_log': ['activity_retention_days'],
  'public.lesson_counts_for_pay': ['payout_count_late', 'payout_count_no_show', 'payout_count_trials'],
  'public.v_student_list': ['renewal_alert_remaining'],
  'public.set_assistant_terms': ['academy_timezone'],
  'public.google_sync_on': ['google_sync_enabled'],
  'public.google_sync_window_days': ['google_calendar_window_days'],
  'public.renewal_commission_share': ['renewal_commission_percent'],
  'public.presence_enabled': ['presence_enabled'],
  'public.renewal_commission_enabled': ['renewal_commission_enabled'],
  'public.renewal_commission_off_since': ['renewal_commission_enabled'],
};

describe('every key a SQL reader names is seeded (docs/26 §2b)', () => {
  it('reads every migration, and finds exactly the readers docs/26a Part B §2 lists', () => {
    expect(Object.keys(MIGRATIONS).length).toBeGreaterThan(100);
    expect(Object.fromEntries(readers)).toEqual(DOC_READERS);
  });

  it('the extracted keys are non-empty and all in SEED_ENTRIES', () => {
    const named = [...new Set([...readers.values()].flat())].sort();
    expect(named.length).toBeGreaterThan(0);
    const seeded = new Set(SEED_ENTRIES.map((e) => e.key));
    expect(named.filter((k) => !seeded.has(k))).toEqual([]);
  });
});
