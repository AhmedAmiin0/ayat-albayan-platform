import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 20261015000440..442 (owner 2026-10-15, R-STU-05, docs/18): the new student statuses.

const read = (name: string) =>
  readFileSync(join(__dirname, `../../../../../../packages/db/supabase/migrations/${name}.sql`), 'utf8').replace(/--.*$/gm, '');
const values = read('20261015000440_student_statuses_enum');
const defaults = read('20261015000441_student_statuses_defaults');
const reclassify = read('20261015000442_student_statuses_reclassify');

describe('migration 440: enum values only', () => {
  it('adds new before trial, pending_subscription after trial, expired after pending_renewal', () => {
    expect(values).toContain("add value if not exists 'new' before 'trial';");
    expect(values).toContain("add value if not exists 'pending_subscription' after 'trial';");
    expect(values).toContain("add value if not exists 'expired' after 'pending_renewal';");
  });

  it('nothing else: a value cannot be used in the migration that adds it', () => {
    const statements = values.split(';').map((s) => s.trim()).filter(Boolean);
    expect(statements).toHaveLength(3);
    for (const s of statements) expect(s).toMatch(/^alter type public\.student_status add value/);
  });
});

describe('migration 441: default, setting, chat scope', () => {
  it('a student inserted without a status is new', () => {
    expect(defaults).toMatch(/alter table public\.students alter column status set default 'new';/);
  });

  it('seeds subscription_expiry_days = 7 without overwriting an edited row', () => {
    expect(defaults).toMatch(/\('subscription_expiry_days', '7'::jsonb\)\s+on conflict \(key\) do nothing;/);
  });

  it('teacher_thread_phones hides every not-yet-subscribed family, service role only', () => {
    expect(defaults).toContain("s.status not in ('new', 'trial', 'pending_subscription')");
    expect(defaults).toContain('language sql stable security definer set search_path = \'\' as');
    expect(defaults).toContain('revoke execute on function public.teacher_thread_phones(uuid) from public, anon, authenticated;');
  });
});

describe('migration 442: one-time reclassification', () => {
  it('reads trial students only and moves them compare-and-set', () => {
    expect(reclassify).toMatch(/from public\.students s\s+where s\.status = 'trial'/);
    expect(reclassify).toMatch(/where s\.id = t\.id and t\.to_status is not null and s\.status = 'trial'/);
    expect(reclassify).not.toMatch(/\bdelete\b/i);
  });

  it('a trial lesson: a platform trial rule, or an imported one (no rule, not instant / makeup, not chargeable)', () => {
    expect(reclassify).toMatch(/left join public\.schedule_rules r on r\.id = l\.rule_id/);
    expect(reclassify).not.toMatch(/\n\s*join public\.schedule_rules/);
    expect(reclassify).toContain(
      "where r.package = 'trial'\n      or (l.rule_id is null and not l.instant and l.makeup_of_id is null and not ls.chargeable)",
    );
  });

  it('attended trial lesson (completed / late, not absent / excused) and no positive payment → pending_subscription', () => {
    expect(reclassify).toContain("t.status in ('completed', 'late')");
    expect(reclassify).toContain("coalesce(t.attendance::text, 'on_time') not in ('absent', 'excused')");
    expect(reclassify).toContain("p.kind = 'payment' and p.amount > 0");
    expect(reclassify).toContain("when f.attended and not f.paid then 'pending_subscription'");
  });

  it('no platform trial lesson and none attended → new (an imported missed trial too); everyone else unchanged', () => {
    expect(reclassify).toMatch(/from trial_lessons t where t\.student_id = s\.id and t\.platform\s+\) as platform_trial/);
    expect(reclassify).toContain("when not (f.platform_trial or f.attended) then 'new'");
    expect(reclassify.match(/r\.package = 'trial'/g)).toHaveLength(2);
    expect(reclassify).not.toMatch(/\belse\b/);
  });

  it('one audit row per changed student: actor null, status_change, reason statuses_2026_10_15', () => {
    expect(reclassify).toMatch(/insert into public\.audit_log \(actor_id, entity, entity_id, action, before, after\)\s+select null, 'students', c\.id, 'status_change'/);
    expect(reclassify).toContain("'reason', 'statuses_2026_10_15'");
    expect(reclassify).toContain("jsonb_build_object('status', 'trial')");
  });
});
