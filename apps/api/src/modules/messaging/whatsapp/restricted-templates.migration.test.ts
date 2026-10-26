import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESTRICTED_TEMPLATE_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// The restricted allow-list (owner 2026-10-12). No database runs in unit tests: this pins the shape.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261012000360_restricted_templates.sql'), 'utf8');

describe('migration 20261012000360: the restricted template allow-list', () => {
  it('flags exactly the defaults of its day, idempotently (only rows that differ are written)', () => {
    // trial_reschedule joined the defaults later, seeded already flagged by migration 460.
    const atTheTime = RESTRICTED_TEMPLATE_DEFAULTS.filter((k) => k !== 'trial_reschedule');
    expect(atTheTime).toEqual(['free_trial_invite', 'welcome_greeting']);
    const list = atTheTime.map((k) => `'${k}'`).join(', ');
    expect(sql).toContain(`set sales_starter = (key in (${list}))`);
    expect(sql).toContain(`where sales_starter is distinct from (key in (${list}))`);
  });

  it('documents the widened meaning on the column', () => {
    expect(sql).toMatch(/comment on column public\.message_templates\.sales_starter is\s+'Allowed for restricted roles/);
  });

  it('lists templates.send_all for the system admin only, re-runnable', () => {
    expect(sql).toContain("select r.id, 'templates.send_all' from public.roles r where r.is_system and r.key in ('admin')\non conflict do nothing;");
  });
});
