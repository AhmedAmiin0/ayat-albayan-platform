import { readFileSync } from 'node:fs';
import { PAYMENT_LINK_CURRENCIES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261115000100 read as text: no database in unit tests (CI's e2e job applies it).
const file = '20261115000100_payment_links_currencies.sql';
const sql = readFileSync(migrationPath(file), 'utf8');

describe('migration 20261115000100: payment link currencies', () => {
  it('the check holds exactly the shared list (the API refuses the rest before any write)', () => {
    const list = /check \(currency in \(([^)]*)\)\)/.exec(sql)?.[1] ?? '';
    const isos = list.split(',').map((c) => c.trim().replaceAll("'", ''));
    expect(isos).toEqual([...PAYMENT_LINK_CURRENCIES]);
  });

  it('idempotent and short-locked: drop if exists, then add; a lock timeout', () => {
    expect(sql).toContain('drop constraint if exists payment_links_currency_check;');
    expect(sql).toContain("set local lock_timeout = '5s';");
  });
});
