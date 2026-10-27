import { NO_REACTIONS, nextReaction, REACTION_EMOJIS, type MessageReactions, type MessageView } from '@ab/shared';

// «تفاعل» (owner 2026-10-27) for web and mobile: the endpoint, the optimistic change, the pill and the
// «who reacted» lines. Pure: the apps own the request, the cache and the UI.

/** PUT {emoji, clientRequestId}: ours on that message (null removes it). */
export const reactionPath = (phone: string, messageId: string): string =>
  `/threads/${encodeURIComponent(phone)}/messages/${messageId}/reaction`;

/** What a tap on `tapped` asks for: our current emoji again removes it. */
export const tappedReaction = (r: MessageReactions | undefined, tapped: string): string | null =>
  nextReaction(r?.ours ?? null, tapped);

/** The bubble's reactions with ours replaced at once (`by` = the signed-in staff member's name). */
export function withOurs(r: MessageReactions | undefined, ours: { emoji: string | null; by: string | null }): MessageReactions {
  return { ...(r ?? NO_REACTIONS), ours: ours.emoji, ours_by: ours.emoji ? ours.by : null };
}

/** One message of a cached page list replaced by `patch` (the optimistic change, the server's answer or the rollback). */
export function patchMessage<P extends { messages: readonly MessageView[] }>(pages: readonly P[], id: string, patch: Partial<MessageView>): P[] {
  return pages.map((p) => (p.messages.some((m) => m.id === id) ? { ...p, messages: p.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) } : p));
}

export interface PillItem {
  emoji: string;
  count: number;
}

/** The pill under a bubble: theirs then ours, one emoji counted twice when both chose it; [] = no pill. */
export function reactionPill(r: MessageReactions | undefined): PillItem[] {
  const all = [r?.theirs, r?.ours].filter((e): e is string => Boolean(e));
  return all.reduce<PillItem[]>((out, emoji) => {
    const same = out.find((i) => i.emoji === emoji);
    if (same) same.count += 1;
    else out.push({ emoji, count: 1 });
    return out;
  }, []);
}

/** One line of the «who reacted» sheet; `mine` = ours, removable («إزالة»). */
export interface ReactorLine {
  emoji: string;
  /** The contact's name (the chat's title) or the staff member's; null = say «you» / «the academy». */
  name: string | null;
  mine: boolean;
}

/** The sheet's lines: the contact first, then ours. */
export function reactorLines(r: MessageReactions | undefined, contact: string | null): ReactorLine[] {
  const theirs = r?.theirs ? [{ emoji: r.theirs, name: contact, mine: false }] : [];
  const ours = r?.ours ? [{ emoji: r.ours, name: r.ours_by, mine: true }] : [];
  return [...theirs, ...ours];
}

/** The spoken name's key under `inbox.reactions` for a quick-row emoji (REACTION_EMOJIS' order). */
export type ReactionName = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'thanks';
const NAMES: readonly ReactionName[] = ['like', 'love', 'laugh', 'wow', 'sad', 'thanks'];

/** null for any other emoji (from «+» or the contact): say the emoji itself. */
export function reactionName(emoji: string): ReactionName | null {
  const i = (REACTION_EMOJIS as readonly string[]).indexOf(emoji);
  return i >= 0 ? (NAMES[i] ?? null) : null;
}
