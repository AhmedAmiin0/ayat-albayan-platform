import { systemPermissionsOf } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../../../common/auth/verify-token';
import type { TeacherScopes } from '../../../inbox/teacher-scope';
import { ADMIN, ASSISTANT, SALES, TEACHER } from '../../classroom.fakes';
import { MeetingInvitePolicies, teacherMaySend, visibleCode, visibleView } from './meeting-invite.policy';
import { CLOSED_PHONE, OPEN_PHONE, teacherScopesFake } from './meeting-invites.fakes';

const OTHER = '+201000000109';
const policies = (scopes = teacherScopesFake()) => new MeetingInvitePolicies(scopes as unknown as TeacherScopes);
const withPerms = (user: AuthUser, drop: string): AuthUser => ({ ...user, permissions: systemPermissionsOf(user.role ?? 'teacher').filter((p) => p !== drop) });

describe('InvitePolicy: who may send WhatsApp through invitations (owner 2026-10-13)', () => {
  it('admin and sales: every phone, the exact codes', async () => {
    for (const user of [ADMIN, SALES]) {
      const p = await policies().of(user);
      expect([p.seesAll, p.mayChat(OTHER), p.teacherId]).toEqual([true, true, null]);
    }
  });

  it("a teacher: only the families the inbox lets them write to (assertCanSend), never their own chat", async () => {
    const p = await policies().of(TEACHER);
    expect([p.seesAll, p.mayChat(OPEN_PHONE), p.mayChat(CLOSED_PHONE), p.mayChat(OTHER)]).toEqual([false, true, true, false]);
    expect(p.teacherId).toBe('t1');
    expect(teacherMaySend({ teacherId: 't', teacherName: 'x', phones: new Set([OPEN_PHONE]), ownPhone: OPEN_PHONE }, OPEN_PHONE)).toBe(false);
  });

  it('a teacher whose scope cannot be read sends nothing', async () => {
    const scopes = teacherScopesFake();
    scopes.of.mockRejectedValue(new Error('teacher_not_linked'));
    expect((await policies(scopes).of(TEACHER)).mayChat(OPEN_PHONE)).toBe(false);
  });

  it('no inbox.send (a classroom assistant, a custom role) → never WhatsApp', async () => {
    expect((await policies().of(ASSISTANT)).mayChat(OPEN_PHONE)).toBe(false);
    expect((await policies().of(withPerms(TEACHER, 'inbox.send'))).mayChat(OPEN_PHONE)).toBe(false);
    expect((await policies().of(withPerms(SALES, 'inbox.send'))).mayChat(OPEN_PHONE)).toBe(false);
  });

  it('no_thread reads as session_closed unless the caller sees everything', () => {
    expect(visibleCode('no_thread', false)).toBe('session_closed');
    expect(visibleCode('no_thread', true)).toBe('no_thread');
    expect(visibleCode('line_not_configured', false)).toBe('line_not_configured');
  });

  it('a typed phone shows no name to a non-all caller; students, staff and admins keep theirs', () => {
    const v = { id: 'i', kind: 'phone' as const, display_name: 'أم سهيلة', channel: 'link' as const, status: 'sent' as const, error_code: null, sent_at: null };
    expect(visibleView(v, false).display_name).toBe('');
    expect(visibleView(v, true).display_name).toBe('أم سهيلة');
    expect(visibleView({ ...v, kind: 'student' }, false).display_name).toBe('أم سهيلة');
  });
});
