import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 410–413 (R-MEET-01..03). No database runs in unit tests: this pins their shape.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const read = (file: string) => readFileSync(join(dir, file), 'utf8');
const schedule = read('20261012000410_meeting_schedule.sql');
const invitees = read('20261012000411_meeting_invitees.sql');
const rls = read('20261012000412_meeting_invitees_rls.sql');
const limit = read('20261012000413_meeting_invite_limit.sql');

describe('meeting migrations 410–413', () => {
  it('live only in 20261012000410–419', () => {
    const ours = readdirSync(dir).filter((f) => /meeting_(schedule|invite)/.test(f));
    expect(ours.every((f) => /^202610120004(1\d)_/.test(f))).toBe(true);
  });

  it('410: nullable start / planned end / cancelled, never reusing ends_at; re-runnable', () => {
    for (const col of ['starts_at', 'planned_end_at', 'cancelled_at']) {
      expect(schedule).toContain(`alter table public.meetings add column if not exists ${col} timestamptz;`);
    }
    expect(schedule).toContain('planned_end_at > starts_at');
    expect(schedule).toContain('grant select (starts_at, planned_end_at, cancelled_at) on public.meetings to authenticated;');
    expect(schedule).not.toMatch(/ends_at\s*=/);
  });

  it('411: invitees with kinds, channels, statuses, E.164, hashed tokens and partial uniques', () => {
    expect(invitees).toContain('create table if not exists public.meeting_invitees');
    expect(invitees).toContain('references public.meetings (id) on delete cascade');
    expect(invitees).toContain("check (kind in ('staff', 'student', 'phone'))");
    expect(invitees).toContain("check (channel in ('in_app', 'whatsapp', 'link'))");
    expect(invitees).toContain("check (status in ('pending', 'sent', 'window_closed', 'failed', 'cancelled'))");
    expect(invitees).toContain("check (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$')");
    expect(invitees).toContain("token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$')");
    expect(invitees).toMatch(/on public\.meeting_invitees \(meeting_id, profile_id\)\s+where profile_id is not null/);
    expect(invitees).toMatch(/on public\.meeting_invitees \(meeting_id, phone_e164\)\s+where phone_e164 is not null/);
  });

  it('412: RLS on; creator, admin and the invited profile read; never the phone or hash; invited staff read the meeting', () => {
    expect(rls).toContain('alter table public.meeting_invitees enable row level security;');
    expect(rls).toContain('public.is_admin() or profile_id = (select auth.uid()) or public.is_meeting_creator(meeting_id)');
    expect(rls).toContain('revoke all on public.meeting_invitees from authenticated;');
    const grant = /grant select \(([^)]*)\)\s+on public\.meeting_invitees/.exec(rls)?.[1] ?? '';
    expect(grant).not.toMatch(/phone_e164|token_hash/);
    expect(rls).toContain('create policy meetings_invited_read on public.meetings for select to authenticated using (');
    expect(rls.match(/security definer set search_path = public/g)).toHaveLength(2);
    expect(rls).not.toContain('lesson_recordings');
  });

  it('413: the daily limit index is partial on the invitation prefix', () => {
    expect(limit).toContain("where dedup_key like 'meeting_invite:%';");
  });
});
