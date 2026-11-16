import type { ChannelReads } from '@ab/shared';
import type { ChannelMember } from '@/modules/teaching/student-channels/reads/channel-members';
import type { ReadMark } from '@/modules/teaching/student-channels/reads/channel-reads.repo';
import { atOrAfter, micros } from '@/modules/teaching/student-channels/reads/instant';

interface Message {
  created_at: string;
  sender_profile_id: string | null;
}

interface ReadsInput {
  members: readonly ChannelMember[];
  marks: readonly ReadMark[];
  names: ReadonlyMap<string, string>;
}

/** A member's read mark when it covers `created` (to the microsecond), else null. */
function markOf(marks: readonly ReadMark[]) {
  const at = new Map(marks.map((m) => [m.profile_id, m.last_read_at]));
  return (profileId: string, created: string): string | null => {
    const mark = at.get(profileId);
    return mark !== undefined && atOrAfter(mark, created) ? mark : null;
  };
}

/** Everyone in the chat but the message's sender: read (with the mark, oldest first) or not. */
export function toReads(message: Message, input: ReadsInput): ChannelReads {
  const covered = markOf(input.marks);
  const others = input.members.filter((m) => m.profileId !== message.sender_profile_id);
  const seen = others.map((m) => ({
    who: { name: input.names.get(m.profileId) ?? '', role: m.role },
    at: covered(m.profileId, message.created_at),
  }));
  return {
    read: seen
      .flatMap((s) => (s.at === null ? [] : [{ ...s.who, at: s.at }]))
      .sort((a, b) => micros(a.at) - micros(b.at)),
    unread: seen.filter((s) => s.at === null).map((s) => s.who),
  };
}

/** My messages that every other member has read (none while nobody else is in the chat). */
export function readByAll(
  mine: readonly { id: string; created_at: string }[],
  input: { me: string; members: readonly ChannelMember[]; marks: readonly ReadMark[] },
): Set<string> {
  const covered = markOf(input.marks);
  const others = input.members.filter((m) => m.profileId !== input.me);
  const byAll = (created: string): boolean =>
    others.length > 0 && others.every((o) => covered(o.profileId, created) !== null);
  return new Set(mine.filter((m) => byAll(m.created_at)).map((m) => m.id));
}
