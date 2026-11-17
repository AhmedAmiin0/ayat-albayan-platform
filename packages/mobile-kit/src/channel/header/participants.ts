import type { ChannelMessageView } from '@ab/shared';

/** The most names the header line shows before «أنت». */
const MAX_NAMES = 4;

/**
 * The chat's people as the loaded messages name them (the API sends no member list yet): every
 * other sender once, newest speaker first, at most four, then «أنت» last (the ChatX boards).
 */
export function participantNames(
  messages: readonly Pick<ChannelMessageView, 'mine' | 'sender_name'>[],
  you: string,
): string[] {
  const others = messages
    .filter((m) => !m.mine && m.sender_name.trim() !== '')
    .map((m) => m.sender_name.trim())
    .reverse();
  return [...new Set(others)].slice(0, MAX_NAMES).concat(you);
}
