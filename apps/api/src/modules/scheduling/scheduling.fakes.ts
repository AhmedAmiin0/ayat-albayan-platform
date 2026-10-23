// Test fixtures for the scheduling tests (not shipped; excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type { Db } from '../../common/db/db.module';
import type { RuleWithLinks } from './schedule.queries';

export const RULE_ID = '00000000-0000-4000-8000-0000000000a1';
export const TEACHER_ID = '00000000-0000-4000-8000-0000000000b1';
export const STUDENT_ID = '00000000-0000-4000-8000-0000000000c1';

/** Sun + Tue 17:00 Riyadh (14:00Z), 45 min, from Sun 2026-10-04, one student, teacher link. */
export function ruleRow(over: Partial<RuleWithLinks> = {}): RuleWithLinks {
  return {
    id: RULE_ID,
    teacher_id: TEACHER_ID,
    duration_min: 45,
    start_time_local: '17:00:00',
    tz: 'Asia/Riyadh',
    byday: [0, 2],
    starts_on: '2026-10-04',
    ends_on: null,
    status: 'active',
    meeting_link: null,
    package: '8',
    created_from_lead_id: null,
    created_at: '2026-10-01T10:00:00+00:00',
    updated_at: '2026-10-01T10:00:00+00:00',
    created_by: null,
    client_request_id: null,
    first_rule_id: null,
    subscription_id: null,
    teacher: { id: TEACHER_ID, meeting_link: 'https://meet.jit.si/abrar', tz: 'Africa/Cairo' },
    schedule_rule_students: [{ student_id: STUDENT_ID, student: { meeting_link_override: null } }],
    ...over,
  };
}

export type StoredLesson = {
  id: string;
  rule_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  meeting_link: string | null;
};
type Occ = { starts_at: string; ends_at: string; meeting_link: string | null };

/**
 * In-memory stand-in for public.generate_rule_lessons (migration 080): unique (rule_id, starts_at)
 * with `on conflict do nothing` — an existing row (whatever its status) is neither duplicated nor
 * touched — and 'rule_not_active' unless `ruleStatus` is active. Returns only inserted rows.
 */
export function fakeLessonsDb(state: { ruleStatus: string } = { ruleStatus: 'active' }) {
  const lessons = new Map<string, StoredLesson>();
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });
    if (state.ruleStatus !== 'active') {
      return { data: null, error: { code: 'P0001', message: 'rule_not_active' } };
    }
    const ruleId = String(args['p_rule']);
    const inserted: StoredLesson[] = [];
    for (const o of args['p_lessons'] as Occ[]) {
      const key = `${ruleId}:${new Date(o.starts_at).toISOString()}`;
      if (lessons.has(key)) continue;
      const row = { id: `lesson-${lessons.size + 1}`, rule_id: ruleId, status: 'scheduled', ...o };
      lessons.set(key, row);
      inserted.push(row);
    }
    return { data: inserted, error: null };
  };
  /** lessons.conflicts writes (LessonWriter.flagConflicts). */
  const flags: { id: string; conflicts: unknown }[] = [];
  const from = () => ({
    update: (patch: { conflicts: unknown }) => ({
      eq: async (_col: string, id: string) => {
        flags.push({ id, conflicts: patch.conflicts });
        return { error: null };
      },
    }),
  });
  return { db: { rpc, from } as unknown as Db, lessons, rpcCalls, state, flags };
}

export function fakeAudit() {
  const record = vi.fn().mockResolvedValue(undefined);
  return { audit: { record } as unknown as AuditService, record };
}
