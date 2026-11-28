import { describe, expect, it } from 'vitest';
import { inviteeRow } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.rows';
import type { InvitePolicy } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.policy';
import type { ResolvedInvitee } from '@/modules/teaching/classroom/meetings/invites/meeting-invitee.resolver';

const policy = (chat: boolean): InvitePolicy => ({
  seesAll: false,
  mayChat: (phone) => chat && phone !== '',
  teacherId: null,
});
const run = (chat: boolean) => ({ meeting: { id: 'm1' }, actorId: 'a1', policy: policy(chat) });

const guardian: ResolvedInvitee = {
  kind: 'student',
  profileId: null,
  studentId: 's1',
  phone: '+201000000000',
  displayName: 'x'.repeat(130),
  tz: 'Africa/Cairo',
};

describe('inviteeRow', () => {
  it('a pending row with the name cut at 120 characters', () => {
    const row = inviteeRow(run(true), guardian);
    expect(row).toMatchObject({ meeting_id: 'm1', status: 'pending', created_by: 'a1' });
    expect(row.display_name).toHaveLength(120);
  });

  it('staff: in the app, whatever the caller may send', () => {
    const staff = { ...guardian, kind: 'staff' as const, phone: null };
    expect(inviteeRow(run(true), staff).channel).toBe('in_app');
  });

  it('a caller who may chat: whatsapp; one who may not, or no phone: a link', () => {
    expect(inviteeRow(run(true), guardian).channel).toBe('whatsapp');
    expect(inviteeRow(run(false), guardian).channel).toBe('link');
    expect(inviteeRow(run(true), { ...guardian, phone: null }).channel).toBe('link');
  });
});
