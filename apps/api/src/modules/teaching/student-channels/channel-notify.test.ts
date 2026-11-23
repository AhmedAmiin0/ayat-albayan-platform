import type { ChannelSenderRole } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { PushService, PushTarget } from '@/common/push/push.service';
import type { PresenceRepo } from '@/modules/people/presence';
import type { ChannelActor } from './channel-access';
import { ChannelNotify } from './channel-notify';
import type { ChannelPeopleRepo } from './channel-people.repo';
import type { FamilyChatSettings, TeacherChatSettings } from './family-chat.settings';
import { ChannelMembers } from './reads/channel-members';

// Everyone in the chat but the sender; the family only while family_chat_enabled is on; the
// assistant is the one in the seat.

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
  /** The seat holder (owner 2026-11-16 «… but only 1»); null = a free seat. */
  assistant?: string | null;
  familyOn?: boolean;
  /** settings.teacher_student_messages_enabled. */
  teachersOn?: boolean;
}

function notifier(setup: Setup = {}) {
  const { members = [TEACHER, GUARDIAN, STUDENT], assistant = 'p-a', familyOn = true } = setup;
  const { teachersOn = true } = setup;
  const push = { notifyProfiles: vi.fn(async (_target: PushTarget) => undefined) };
  const people = {
    assistantId: vi.fn(async () => assistant),
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
    { enabled: vi.fn(async () => teachersOn) } as unknown as TeacherChatSettings,
  );
  return { notify, push, people };
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

  it('a sender without a name, or with a blank one, reads as their role word', async () => {
    expect((await told('student'))?.vars).toMatchObject({ name: 'الطالب' });
    const { notify, push, people } = notifier();
    people.names.mockResolvedValueOnce(new Map([['p-g', ' \t']]));
    await notify.sent(actor('guardian'), message);
    expect(push.notifyProfiles.mock.calls[0]?.[0].vars).toMatchObject({ name: 'ولي الأمر' });
  });

  it('family_chat_enabled off: the teacher\'s message reaches the assistant only', async () => {
    expect(await toldIds('teacher', { familyOn: false })).toEqual(['p-a']);
  });

  it('a student without a login, a guardian without one, a free seat: only who exists', async () => {
    expect(await toldIds('teacher', { members: [TEACHER, GUARDIAN] })).toEqual(['p-g', 'p-a']);
    expect(await toldIds('teacher', { members: [TEACHER, STUDENT] })).toEqual(['p-s', 'p-a']);
    expect(await toldIds('guardian', { assistant: null })).toEqual(['p-t', 'p-s']);
  });

  it('one assistant only: the seat holder, never the sender', async () => {
    expect(await toldIds('teacher', { assistant: 'p-b' })).toEqual(['p-g', 'p-s', 'p-b']);
    expect(await toldIds('sales', { assistant: 'p-a' })).toEqual(['p-t', 'p-g', 'p-s']);
  });

  it('a monitor writes nothing and so notifies nobody', async () => {
    const { notify, push } = notifier();
    const monitor = { mode: 'monitor', studentId: 'st1', profileId: 'p-a', open: true } as const;
    await notify.sent(monitor, message);
    expect(push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('teacher_student_messages_enabled off: no teacher hears it (no push, no bell row)', async () => {
    const off = { teachersOn: false };
    expect(await toldIds('sales', off)).toEqual(['p-g', 'p-s']);
    expect(await toldIds('guardian', off)).toEqual(['p-s', 'p-a']);
    expect(await toldIds('sales', { ...off, familyOn: false })).toEqual([]);
    expect(await toldIds('teacher', off)).toEqual(['p-g', 'p-s', 'p-a']);
  });

  it('a student row gone meanwhile: the push still goes, without a student name', async () => {
    const { notify, push, people } = notifier();
    people.students.mockResolvedValueOnce([]);
    await notify.sent(actor('teacher'), message);
    expect(push.notifyProfiles.mock.calls[0]?.[0].vars).toMatchObject({ student: '' });
  });
});
