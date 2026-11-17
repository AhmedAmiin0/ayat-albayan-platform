import type { ChannelSenderRole } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { PushService, PushTarget } from '@/common/push/push.service';
import type { PresenceRepo } from '@/modules/people/presence';
import type { ChannelActor } from './channel-access';
import { ChannelNotify } from './channel-notify';
import type { ChannelPeopleRepo } from './channel-people.repo';
import type { FamilyChatSettings } from './family-chat.settings';
import { ChannelMembers } from './reads/channel-members';

// Owner 2026-11-16 «all 4 will receive the message teacher guardian student and the assistant»:
// everyone in the chat but the sender; the family only while family_chat_enabled is on.

interface Person {
  profile_id: string;
  role: ChannelSenderRole;
}
const TEACHER: Person = { profile_id: 'p-t', role: 'teacher' };
const GUARDIAN: Person = { profile_id: 'p-g', role: 'guardian' };
const STUDENT: Person = { profile_id: 'p-s', role: 'student' };
const SENDER: Record<ChannelSenderRole, string> = {
  teacher: 'p-t',
  guardian: 'p-g',
  student: 'p-s',
  sales: 'p-a',
};
/** The student login has no name row: its role word stands in. */
const NAMES: ReadonlyMap<string, string> = new Map([['p-t', 'أ. هدى'], ['p-g', 'أم سارة']]);

interface Setup {
  members?: Person[];
  owners?: string[];
  familyOn?: boolean;
}

function notifier(setup: Setup = {}) {
  const { members = [TEACHER, GUARDIAN, STUDENT], owners = ['p-a'], familyOn = true } = setup;
  const push = { notifyProfiles: vi.fn(async (_target: PushTarget) => undefined) };
  const people = {
    ownerIds: vi.fn(async () => owners),
    students: vi.fn(async () => [{ id: 'st1', name: 'سارة', code: 'AB-0201' }]),
    names: vi.fn(async (ids: readonly string[]) =>
      new Map([...NAMES].filter(([id]) => ids.includes(id))),
    ),
  };
  const inChat = new ChannelMembers(
    { channelPeople: vi.fn(async () => members) } as unknown as PresenceRepo,
    people as unknown as ChannelPeopleRepo,
    { enabled: vi.fn(async () => familyOn) } as unknown as FamilyChatSettings,
  );
  const notify = new ChannelNotify(
    people as unknown as ChannelPeopleRepo,
    inChat,
    push as unknown as PushService,
  );
  return { notify, push };
}

const actor = (role: ChannelSenderRole): ChannelActor => ({
  mode: 'participant', studentId: 'st1', profileId: SENDER[role], role, open: true,
});
const message = {
  id: 'm1', body: 'السلام عليكم', sender_profile_id: null, sender_role: 'teacher', created_at: '',
};

async function told(role: ChannelSenderRole, setup?: Setup): Promise<PushTarget | undefined> {
  const { notify, push } = notifier(setup);
  await notify.sent(actor(role), message);
  return push.notifyProfiles.mock.calls[0]?.[0];
}
const toldIds = async (role: ChannelSenderRole, setup?: Setup) =>
  (await told(role, setup))?.profileIds;

describe('ChannelNotify: who hears a chat message', () => {
  it('a teacher → the guardian, the student and the assistant', async () => {
    expect(await toldIds('teacher')).toEqual(['p-g', 'p-s', 'p-a']);
  });

  it('a guardian → the teacher, the student and the assistant', async () => {
    expect(await toldIds('guardian')).toEqual(['p-t', 'p-s', 'p-a']);
  });

  it('a student → the teacher, the guardian and the assistant', async () => {
    expect(await toldIds('student')).toEqual(['p-t', 'p-g', 'p-a']);
  });

  it('the assistant (owner 11-16 «yes it can write also») → the teacher, guardian and student', async () => {
    expect(await toldIds('sales')).toEqual(['p-t', 'p-g', 'p-s']);
    expect(await toldIds('sales', { familyOn: false })).toEqual(['p-t']);
    expect((await told('sales'))?.vars).toMatchObject({ name: 'مسؤول المتابعة' });
  });

  it('one push of kind channel_message: who wrote, about which student, the preview', async () => {
    const sent = await told('guardian');
    const data = { studentId: 'st1' };
    expect(sent).toMatchObject({ kind: 'channel_message', subject: 'm1', data });
    expect(sent?.vars).toEqual({ student: 'سارة', name: 'أم سارة', text: 'السلام عليكم' });
    expect((await told('teacher'))?.vars).toMatchObject({ name: 'أ. هدى' });
  });

  it('a sender without a name reads as their role word', async () => {
    expect((await told('student'))?.vars).toMatchObject({ name: 'الطالب' });
  });

  it('family_chat_enabled off: the teacher\'s message reaches the assistant only', async () => {
    expect(await toldIds('teacher', { familyOn: false })).toEqual(['p-a']);
  });

  it('a student without a login, a guardian without one, no owner: only who exists', async () => {
    expect(await toldIds('teacher', { members: [TEACHER, GUARDIAN] })).toEqual(['p-g', 'p-a']);
    expect(await toldIds('teacher', { members: [TEACHER, STUDENT] })).toEqual(['p-s', 'p-a']);
    expect(await toldIds('guardian', { owners: [] })).toEqual(['p-t', 'p-s']);
  });

  it('never the sender, each once (an owner who also teaches the student)', async () => {
    const ids = await toldIds('teacher', { owners: ['p-t', 'p-a', 'p-a'] });
    expect(ids).toEqual(['p-g', 'p-s', 'p-a']);
  });

  it('a monitor writes nothing and so notifies nobody', async () => {
    const { notify, push } = notifier();
    const monitor = { mode: 'monitor', studentId: 'st1', profileId: 'p-a', open: true } as const;
    await notify.sent(monitor, message);
    expect(push.notifyProfiles).not.toHaveBeenCalled();
  });
});
