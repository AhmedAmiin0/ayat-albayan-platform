import { mayInvitePhones, normalizePhone, type MeetingInviteeInput, type MeetingInviteeKind } from '@ab/shared';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../../common/auth/verify-token';
import { notFound } from '../../../../../common/http/errors';
import { MeetingInvitePolicies, type InvitePolicy } from './meeting-invite.policy';
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
const phoneNotAllowed = () => new ForbiddenException({ code: 'phone_invite_not_allowed', message: 'phone_invite_not_allowed' });
type Picked = readonly MeetingInviteeInput[];

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
 * the guardian's phone, resolved here. A phone: admin and sales only (403 phone_invite_not_allowed),
 * E.164 via normalizePhone (400 invalid_phone); a known guardian lends their name and tz (scope 'all'
 * only: nobody else learns who a number belongs to). The creator never invites themselves.
 */
@Injectable()
export class MeetingInviteeResolver {
  constructor(
    private readonly queries: MeetingInviteeQueries,
    private readonly policies: MeetingInvitePolicies,
  ) {}

  /** What the caller may send through invitations (meeting-invite.policy.ts). */
  policy(user: AuthUser): Promise<InvitePolicy> {
    return this.policies.of(user);
  }

  async scopeOf(user: Pick<AuthUser, 'id' | 'role'>): Promise<StudentScope> {
    if (mayInvitePhones(user.role)) return { kind: 'all' };
    if (user.role === 'teacher') return { kind: 'ids', ids: await this.queries.teacherStudentIds(user.id) };
    if (user.role === 'assistant') return { kind: 'ids', ids: await this.queries.assistantStudentIds(user.id) };
    return { kind: 'ids', ids: [] };
  }

  /** «أعد الإرسال» reaches only whom the caller could invite: a typed phone (403), a student in scope (404). */
  async assertMayReach(user: Pick<AuthUser, 'id' | 'role'>, invitee: { kind: string; student_id: string | null }): Promise<void> {
    if (invitee.kind === 'phone' && !mayInvitePhones(user.role)) throw phoneNotAllowed();
    if (invitee.kind !== 'student') return;
    const scope = await this.scopeOf(user);
    if (scope.kind !== 'all' && !scope.ids.includes(invitee.student_id ?? '')) throw notFound('student_not_found');
  }

  async resolve(input: { user: Pick<AuthUser, 'id' | 'role'>; invitees: readonly MeetingInviteeInput[] }): Promise<ResolvedInvitee[]> {
    const { user, invitees } = input;
    if (invitees.length === 0) return [];
    const scope = await this.scopeOf(user);
    if (scope.kind !== 'all' && invitees.some((i) => i.kind === 'phone')) throw phoneNotAllowed();
    const out = [...(await this.staff(invitees)), ...(await this.students(invitees, scope)), ...(await this.phones({ user, invitees, scope }))];
    return dedupeInvitees(out.filter((i) => i.profileId !== user.id));
  }

  private async staff(invitees: readonly MeetingInviteeInput[]): Promise<ResolvedInvitee[]> {
    const ids = [...new Set(invitees.flatMap((i) => (i.kind === 'staff' ? [i.profileId] : [])))];
    if (ids.length === 0) return [];
    const rows = await this.queries.staff({ ids });
    if (rows.length !== ids.length) throw notFound('staff_not_found');
    return rows.map((p) => ({ kind: 'staff', profileId: p.id, studentId: null, phone: null, displayName: p.full_name, tz: p.tz }));
  }

  private async students(invitees: Picked, scope: StudentScope): Promise<ResolvedInvitee[]> {
    const ids = [...new Set(invitees.flatMap((i) => (i.kind === 'student' ? [i.studentId] : [])))];
    if (ids.length === 0) return [];
    const rows = await this.queries.students({ scope, ids });
    if (rows.length !== ids.length) throw notFound('student_not_found');
    return rows.map((s) => {
      if (!s.guardian) throw notFound('student_not_found');
      return { kind: 'student', profileId: null, studentId: s.id, phone: s.guardian.phone_e164, displayName: s.name, tz: s.guardian.tz };
    });
  }

  /** Typed numbers; a guardian's name and tz only for scope 'all', else the number in the creator's tz. */
  private async phones(v: { user: Pick<AuthUser, 'id'>; invitees: Picked; scope: StudentScope }): Promise<ResolvedInvitee[]> {
    const typed = v.invitees.flatMap((i) => (i.kind === 'phone' ? [i.phone] : []));
    if (typed.length === 0) return [];
    const creatorTz = (await this.queries.profileTz(v.user.id)) ?? FALLBACK_TZ;
    const out: ResolvedInvitee[] = [];
    for (const raw of typed) {
      const parsed = normalizePhone(raw);
      if (!parsed.ok) throw invalidPhone();
      const guardian = v.scope.kind === 'all' ? await this.queries.guardianByPhone(parsed.e164) : null;
      const displayName = guardian?.name ?? parsed.e164;
      out.push({ kind: 'phone', profileId: null, studentId: null, phone: parsed.e164, displayName, tz: guardian?.tz ?? creatorTz });
    }
    return out;
  }
}
