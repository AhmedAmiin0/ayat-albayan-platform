import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261028000941 read as text: no database in unit tests (CI's e2e job applies it to local Supabase).
const sql = readFileSync(migrationPath('20261028000941_stripe_payment_links.sql'), 'utf8');
const fn = (name: string) => new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`).exec(sql)?.[0] ?? '';

describe('migration 941: Stripe payment links (test build)', () => {
  it('RLS on every new table; anon gets nothing; the events table is API-only (no policy)', () => {
    for (const t of ['payment_links', 'stripe_events', 'stripe_settings']) expect(sql).toContain(`alter table public.${t} enable row level security;`);
    expect(sql).toContain('revoke all on table public.payment_links from anon;');
    expect(sql).toContain('revoke all on table public.stripe_events from anon, authenticated;');
    expect(sql).not.toMatch(/create policy[^;]*on public\.stripe_events/);
  });

  it('payment_links: admins all; a salesperson reads and inserts her own only, no update or delete', () => {
    expect(sql).toMatch(/create policy payment_links_admin on public\.payment_links for all to authenticated\s+using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\);/);
    expect(sql).toMatch(/payment_links_own_read on public\.payment_links for select to authenticated\s+using \(created_by = \(select auth\.uid\(\)\) and public\.auth_role\(\) = 'sales'\)/);
    expect(sql).toMatch(/payment_links_own_insert on public\.payment_links for insert to authenticated\s+with check \(created_by = \(select auth\.uid\(\)\)/);
    expect(sql).not.toMatch(/on public\.payment_links for (update|delete)/);
  });

  it('idempotency: event_id primary key; unique token, session, intent and client request; amount > 0; 7-day expiry', () => {
    expect(sql).toContain('event_id text primary key');
    for (const c of ['token text not null unique', 'stripe_session_id text unique', 'stripe_payment_intent text unique', 'client_request_id uuid not null unique'])
      expect(sql).toContain(c);
    expect(sql).toContain('amount numeric(12, 2) not null check (amount > 0)');
    expect(sql).toContain("expires_at timestamptz not null default now() + interval '7 days'");
    expect(sql).toContain("status text not null default 'open' check (status in ('open', 'paid', 'expired', 'cancelled'))");
  });

  it("the gate's DB half defaults to off; 'card' added without being used in the same transaction", () => {
    expect(sql).toContain('stripe_enabled boolean not null default false');
    expect(sql).toContain("alter type public.payment_method add value if not exists 'card';");
    expect(sql.split("add value if not exists 'card';")[1]).not.toMatch(/'card'/);
  });

  it('Vault: security definer with an empty search_path, service role only, a live key refused in SQL too', () => {
    for (const name of ['stripe_secret_set', 'stripe_secret_clear', 'stripe_secret_read', 'stripe_secrets_status']) {
      expect(fn(name)).toContain("security definer set search_path = ''");
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated;`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to service_role;`));
    }
    expect(fn('stripe_secret_set')).toContain("p_value !~ '^(rk|sk)_test_'");
    expect(sql).not.toMatch(/'integration:/);
  });
});
