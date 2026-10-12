import { normalizePhone, type MeetingInviteeInput, type MeetingInviteeKind } from '@ab/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { MeetingInviteeQueries, type StudentScope } from './meeting-invitee.queries';

/** One invitee as the server knows it. The phone stays on the server (never in a response). */
export interface ResolvedInvitee {
  kind: MeetingInviteeKind;
  profileId: string | null;
  studentId: string | null;
  phone: string | null;
  displayName: string;
  /** The tz the invitation's time is written in. */
  tz: string;
}

const FALLBACK_TZ = 'UTC';
const invalidPhone = () => new BadRequestException({ code: 'invalid_phone', message: 'invalid_phone' });

/** Same person twice (a profile, or two students of one guardian) → the first one only. */
export function dedupeInvitees(list: readonly ResolvedInvitee[]): ResolvedInvitee[] {
  const seen = new Set<string>();
  return list.filter((i) => {
    const key = i.profileId ? `p:${i.profileId}` : `t:${i.phone ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Picked invitees → recipients (R-MEET-02). Staff: enabled staff profiles (404 staff_not_found). A
 * student: only one the caller may already see (StudentScope; 404 student_not_found), reached through
 * the guardian's phone, resolved here. A phone: E.164 via normalizePhone (400 invalid_phone); a known
 * guardian lends their name and tz. The creator never invites themselves.
 */
@Injectable()
export class MeetingInviteeResolver {
  constructor(private readonly queries: MeetingInviteeQueries) {}

  async scopeOf(user: Pick<AuthUser, 'id' | 'role'>): Promise<StudentScope> {
    if (user.role === 'admin' || user.role === 'sales') return { kind: 'all' };
    if (user.role === 'teacher') return { kind: 'ids', ids: await this.queries.teacherStudentIds(user.id) };
    if (user.role === 'assistant') return { kind: 'ids', ids: await this.queries.assistantStudentIds(user.id) };
    return { kind: 'ids', ids: [] };
  }

  async resolve(input: { user: Pick<AuthUser, 'id' | 'role'>; invitees: readonly MeetingInviteeInput[] }): Promise<ResolvedInvitee[]> {
    const { user, invitees } = input;
    if (invitees.length === 0) return [];
    const creatorTz = (await this.queries.profileTz(user.id)) ?? FALLBACK_TZ;
    const out = [...(await this.staff(invitees)), ...(await this.students({ user, invitees })), ...(await this.phones(invitees, creatorTz))];
    return dedupeInvitees(out.filter((i) => i.profileId !== user.id));
  }

  private async staff(invitees: readonly MeetingInviteeInput[]): Promise<ResolvedInvitee[]> {
    const ids = [...new Set(invitees.flatMap((i) => (i.kind === 'staff' ? [i.profileId] : [])))];
    if (ids.length === 0) return [];
    const rows = await this.queries.staff({ ids });
    if (rows.length !== ids.length) throw notFound('staff_not_found');
    return rows.map((p) => ({ kind: 'staff', profileId: p.id, studentId: null, phone: null, displayName: p.full_name, tz: p.tz }));
  }

  private async students(input: { user: Pick<AuthUser, 'id' | 'role'>; invitees: readonly MeetingInviteeInput[] }): Promise<ResolvedInvitee[]> {
    const ids = [...new Set(input.invitees.flatMap((i) => (i.kind === 'student' ? [i.studentId] : [])))];
    if (ids.length === 0) return [];
    const rows = await this.queries.students({ scope: await this.scopeOf(input.user), ids });
    if (rows.length !== ids.length) throw notFound('student_not_found');
    return rows.map((s) => {
      if (!s.guardian) throw notFound('student_not_found');
      return { kind: 'student', profileId: null, studentId: s.id, phone: s.guardian.phone_e164, displayName: s.name, tz: s.guardian.tz };
    });
  }

  private async phones(invitees: readonly MeetingInviteeInput[], creatorTz: string): Promise<ResolvedInvitee[]> {
    const out: ResolvedInvitee[] = [];
    for (const i of invitees) {
      if (i.kind !== 'phone') continue;
      const parsed = normalizePhone(i.phone);
      if (!parsed.ok) throw invalidPhone();
      const guardian = await this.queries.guardianByPhone(parsed.e164);
      const displayName = guardian?.name ?? parsed.e164;
      out.push({ kind: 'phone', profileId: null, studentId: null, phone: parsed.e164, displayName, tz: guardian?.tz ?? creatorTz });
    }
    return out;
  }
}
