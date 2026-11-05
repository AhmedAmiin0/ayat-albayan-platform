import { describe, expect, it, vi } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from '@/common/push/push.fakes';
import type { PushTransport } from '@/common/push/push.service';
import type { ThreadMessagesRepo, ThreadsRepo } from '@/modules/messaging/inbox';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { MeetingInviteSender } from './meeting-invite.sender';
import { inviteSubject } from './meeting-invite.text';
import type { StoredInvitee } from './meeting-invitees.repo';

// R-MEET-02 (owner 2026-11-03: «internal meetings should have push notifications»): a staff
// invitee with a live bound device gets the app and browser push on invite, reschedule and cancel.

const MEETING_ID = '6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b';
const INVITEE = { id: 'i1', kind: 'staff', profile_id: 'p1', tz: 'Africa/Cairo' } as StoredInvitee;
const STARTS = '2026-11-04T15:00:00.000Z';

function setup(role: string) {
  const { db } = fakePushDb([{ id: 'p1', role, push_tokens: ['ExponentPushToken[p]'] }]);
  const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
  const { web, send } = fakeWeb();
  const sender = new MeetingInviteSender(
    pushService(db, { transport, web }),
    {} as ThreadsRepo,
    {} as MessageSender,
    {} as ThreadMessagesRepo,
  );
  return { sender, transport, send };
}

const meeting = (startsAt: string | null) => ({
  id: MEETING_ID,
  title: 'اجتماع المعلمين',
  starts_at: startsAt,
});

const CASES = [
  ['instant invite', { meeting: meeting(null), subject: inviteSubject(MEETING_ID, null) }],
  ['scheduled invite', { meeting: meeting(STARTS), subject: inviteSubject(MEETING_ID, STARTS) }],
  [
    'reschedule',
    {
      meeting: meeting(STARTS),
      subject: `${inviteSubject(MEETING_ID, STARTS)}:moved:x`,
      title: ar.meetingInvites.push.rescheduled,
    },
  ],
  [
    'cancel',
    {
      meeting: meeting(STARTS),
      subject: `cancel:${MEETING_ID}`,
      title: ar.meetingInvites.push.cancelled,
    },
  ],
] as const;

describe.each(['admin', 'sales', 'assistant', 'teacher'])(
  'MeetingInviteSender.staff → device push (%s)',
  (role) => {
    it.each(CASES)(
      '%s: the app push and the browser push open the meeting',
      async (_name, notice) => {
        const s = setup(role);
        await s.sender.staff({ ...notice, invitee: INVITEE });
        await flushPushes();
        const title = 'title' in notice ? notice.title : 'دعوة إلى اجتماع';
        expect(s.transport).toHaveBeenCalledWith([
          expect.objectContaining({
            to: 'ExponentPushToken[p]',
            title,
            data: { kind: 'meeting_invite', meetingId: MEETING_ID },
          }),
        ]);
        expect(s.send).toHaveBeenCalledWith(
          'p1',
          expect.objectContaining({ title, url: `/meeting/${MEETING_ID}` }),
        );
      },
    );
  },
);
