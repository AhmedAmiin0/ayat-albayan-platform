import type { Page } from '@playwright/test';
import { withSql } from '../core/schedule';

// The short-link gate /l/<code> (docs/19 «Gate flow»): managed links written straight into the
// database (the admin screens are another spec's), each with a fresh code, so the desktop and
// mobile runs never share one. Example data only.

/** Every seeded link's target: https (the table's check), answered by the page itself. */
export const GATE_TARGET = 'https://gate-target.example.test/landing?from=gate';

/** The target host answered in the browser, so the jump is seen without the internet. */
export async function catchGateTarget(page: Page): Promise<void> {
  await page.route('https://gate-target.example.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>target</p>' }),
  );
}

interface GateLinkSeed {
  title?: string;
  status?: 'active' | 'expired' | 'revoked';
  audience?: 'anyone' | 'listed';
  maxUsers?: number | null;
  /** Listed phones (E.164), for audience listed. */
  phones?: string[];
  /** Phones that already opened it (one visit each), to fill max_users. */
  visitors?: string[];
}

const DEFAULTS = {
  target: GATE_TARGET, title: 'رابط اللقاء التعريفي', status: 'active', audience: 'anyone',
  maxUsers: null, phones: [], visitors: [],
} as const satisfies GateLinkSeed & { target: string };

let made = 0;

/** A base62 code no other run used (8–32 characters). */
export function freshLinkCode(): string {
  made += 1;
  return `Gt${Date.now().toString(36)}${made}`.slice(0, 32);
}

/** A managed link as the admin would have made it (7 days left); returns its code. */
export async function seedGateLink(seed: GateLinkSeed = {}): Promise<string> {
  const code = freshLinkCode();
  const s = { ...DEFAULTS, ...seed };
  await withSql(async (sql) => {
    await sql`insert into public.short_links
        (code, target_url, kind, subject, title, expires_at, max_users, audience, status)
      values (${code}, ${s.target}, 'managed', ${code}, ${s.title}, now() + interval '7 days',
        ${s.maxUsers}, ${s.audience}, ${s.status})`;
    for (const phone of s.phones)
      await sql`insert into public.short_link_users (code, phone_e164) values (${code}, ${phone})`;
    for (const phone of s.visitors)
      await sql`select public.short_link_record_visit(${code}, null, ${phone}, null, null)`;
  });
  return code;
}

/** A fresh Saudi number in E.164 (never a seeded family's). */
export const freshGatePhone = (): string => `+9665${String(Date.now()).slice(-8)}`;
