import type { ChannelMessageView, ChannelParticipantView } from '@ab/shared';

const MAX_NAMES = 4;

/** The header's people: the others by name (the avatar takes the first), then the whole line. */
interface HeaderPeople {
  others: string[];
  /** Empty while nobody else is known; the viewer is listed last. */
  line: string[];
  /** The first teacher among the others (the API lists them first): the family's avatar. */
  teacher: string | null;
}

type Speaker = Pick<ChannelMessageView, 'mine' | 'sender_name'>;

interface PeopleSource {
  /** The page's members (the API's list); empty from an older API. */
  participants: readonly ChannelParticipantView[];
  /** Oldest first: the fallback when the API sends no members. */
  messages: readonly Speaker[];
  you: string;
}

const named = (name: string): boolean => name.trim() !== '';

/** Every other sender once, newest speaker first (an older API sends no member list). */
const speakers = (messages: readonly Speaker[]): string[] => [
  ...new Set(
    messages
      .filter((m) => !m.mine && named(m.sender_name))
      .map((m) => m.sender_name.trim())
      .reverse(),
  ),
];

const membersOf = (participants: readonly ChannelParticipantView[]): string[] =>
  participants.filter((p) => !p.me && named(p.name)).map((p) => p.name.trim());

/** The first other teacher by name, or null (none in the list, or an older API). */
const firstTeacher = (participants: readonly ChannelParticipantView[]): string | null =>
  participants.find((p) => !p.me && p.role === 'teacher' && named(p.name))?.name.trim() ?? null;

/** Is the viewer in the chat: a member flagged me, or (no member list) always. */
const isIn = (participants: readonly ChannelParticipantView[]): boolean =>
  participants.length === 0 || participants.some((p) => p.me);

/** Members in API order (teacher first), else the loaded senders; at most four, then the viewer. */
export function headerPeople({ participants, messages, you }: PeopleSource): HeaderPeople {
  const all = participants.length > 0 ? membersOf(participants) : speakers(messages);
  const others = all.slice(0, MAX_NAMES);
  const me = isIn(participants) ? [you] : [];
  const line = others.length > 0 ? [...others, ...me] : [];
  return { others, line, teacher: firstTeacher(participants) };
}
