import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 990 (owner 2026-10-30): the three keys' seed and the stopped mode of 934's cancel
// guard.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261030000990_course_stop_permissions.sql'), 'utf8').replace(
  /--.*$/gm,
  '',
);
const guard = sql.slice(
  sql.indexOf('function public.subscription_cancel_guard()'),
  sql.indexOf('end $$;'),
);

describe('migration 990', () => {
  it('expand-only: one nullable checked column, no drop, idempotent', () => {
    expect(sql).toMatch(
      /add column if not exists cancel_kind text check \(cancel_kind in \('unused', 'stopped'\)\)/,
    );
    expect(sql).not.toMatch(/\bdrop\b/i);
    expect(sql).toMatch(/on conflict do nothing/);
  });

  it('seeds subscriptions.stop, students.change_teacher and courses.reschedule for the system admin and sales only', () => {
    for (const key of ['subscriptions.stop', 'students.change_teacher', 'courses.reschedule'])
      expect(sql).toContain(`select r.id, '${key}' from public.roles r`);
    expect(sql).toMatch(/where r\.is_system and r\.key in \('admin', 'sales'\)/);
    expect(sql).not.toMatch(/'teacher'|'assistant'|'guardian'/);
  });

  it('a stopped cancel needs a reason and no open lesson still to come; money and held lessons never block it', () => {
    const stopped = guard.slice(
      guard.indexOf("if new.cancel_kind = 'stopped'"),
      guard.indexOf('return new;'),
    );
    expect(stopped).toContain('reason_required');
    expect(stopped).toMatch(
      /l\.status in \('scheduled', 'confirmed'\)\s+and l\.starts_at > now\(\)/,
    );
    expect(stopped).toContain('has_future_lessons');
    expect(stopped).not.toContain('payments');
  });

  it("an unused cancel keeps 934's checks (has_payments, has_lessons, has_commission) and the row lock", () => {
    expect(guard).toMatch(/for update/);
    for (const code of ['has_payments', 'has_lessons', 'has_commission'])
      expect(guard).toContain(code);
    expect(sql).toMatch(
      /revoke all on function public\.subscription_cancel_guard\(\) from public, anon, authenticated/,
    );
  });
});
