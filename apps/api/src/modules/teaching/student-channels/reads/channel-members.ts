import type { ChannelSenderRole } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PresenceRepo } from '@/modules/people/presence';
import { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import { FamilyChatSettings } from '@/modules/teaching/student-channels/family-chat.settings';

export interface ChannelMember {
  profileId: string;
  role: ChannelSenderRole;
}

const CHAT_ROLES: Partial<Record<string, ChannelSenderRole>> = {
  teacher: 'teacher',
  guardian: 'guardian',
  student: 'student',
};

const inChat = (role: ChannelSenderRole, familyOn: boolean): boolean =>
  familyOn || role === 'teacher';

/** The chat's people (a family login only while the switch is on), then its seat holder, once. */
function membersOf(input: {
  people: readonly { profile_id: string; role: string }[];
  assistant: string | null;
  familyOn: boolean;
}): ChannelMember[] {
  const members = new Map<string, ChannelSenderRole>();
  for (const p of input.people) {
    const role = CHAT_ROLES[p.role];
    if (role && inChat(role, input.familyOn)) members.set(p.profile_id, role);
  }
  const seat = input.assistant;
  if (seat && !members.has(seat)) members.set(seat, 'sales');
  return [...members].map(([profileId, role]) => ({ profileId, role }));
}

/**
 * Who is in a student's chat now, as ChannelNotify pushes them: the current teacher(s), the
 * guardian and student logins (only while family_chat_enabled is on) and the one assistant in the
 * chat's seat (student_channels.assistant_id). Never a monitor.
 */
@Injectable()
export class ChannelMembers {
  constructor(
    @Inject(PresenceRepo) private readonly presence: PresenceRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(FamilyChatSettings) private readonly familyChat: FamilyChatSettings,
  ) {}

  async of(studentId: string): Promise<ChannelMember[]> {
    const [people, assistant, familyOn] = await Promise.all([
      this.presence.channelPeople(studentId),
      this.people.assistantId(studentId),
      this.familyChat.enabled(),
    ]);
    return membersOf({ people, assistant, familyOn });
  }
}
