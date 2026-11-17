import type { ChannelMessageView, ChannelParticipantView } from '@ab/shared';

/** The most names the header line shows before «أنت». */
const MAX_NAMES = 4;

/** The header's people: the others by name (the avatar takes the first), then the whole line. */
interface HeaderPeople {
  others: string[];
  /** The others, then «أنت» when the viewer is in the chat; empty while nobody else is known. */
  line: string[];
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

/** Is the viewer in the chat: a member flagged me, or (no member list) always. */
const isIn = (participants: readonly ChannelParticipantView[]): boolean =>
  participants.length === 0 || participants.some((p) => p.me);

/**
 * The chat's people for the header (the ChatX boards): the API's members in its order (teacher
 * first), else the loaded messages' senders; at most four, then «أنت» last when she is in it.
 */
export function headerPeople({ participants, messages, you }: PeopleSource): HeaderPeople {
  const all = participants.length > 0 ? membersOf(participants) : speakers(messages);
  const others = all.slice(0, MAX_NAMES);
  const me = isIn(participants) ? [you] : [];
  return { others, line: others.length > 0 ? [...others, ...me] : [] };
}
