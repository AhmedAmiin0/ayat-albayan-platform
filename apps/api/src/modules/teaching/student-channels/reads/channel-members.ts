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

/** The chat's people (a family login only while the switch is on), then its owners, each once. */
function membersOf(input: {
  people: readonly { profile_id: string; role: string }[];
  owners: readonly string[];
  familyOn: boolean;
}): ChannelMember[] {
  const members = new Map<string, ChannelSenderRole>();
  for (const p of input.people) {
    const role = CHAT_ROLES[p.role];
    if (role && inChat(role, input.familyOn)) members.set(p.profile_id, role);
  }
  for (const id of input.owners) if (!members.has(id)) members.set(id, 'sales');
  return [...members].map(([profileId, role]) => ({ profileId, role }));
}

/**
 * Who is in a student's chat now, as ChannelNotify pushes them: the current teacher(s), the
 * guardian and student logins (only while family_chat_enabled is on) and the owning assistant(s).
 * Never a monitor.
 */
@Injectable()
export class ChannelMembers {
  constructor(
    @Inject(PresenceRepo) private readonly presence: PresenceRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(FamilyChatSettings) private readonly familyChat: FamilyChatSettings,
  ) {}

  async of(studentId: string): Promise<ChannelMember[]> {
    const [people, owners, familyOn] = await Promise.all([
      this.presence.channelPeople(studentId),
      this.people.ownerIds(studentId),
      this.familyChat.enabled(),
    ]);
    return membersOf({ people, owners, familyOn });
  }
}
