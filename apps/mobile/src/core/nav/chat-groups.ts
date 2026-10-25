/** As much of a navigation state (full or partial) as this file reads. */
export interface NavState {
  index?: number;
  routes: readonly { name: string; state?: NavState }[];
}

/**
 * Each tree's chat (and what a chat opens) is a root route group beside its tabs, so a chat is a full
 * screen above them with no tab bar under it (react-native-screens#4132: a hidden bar still took the
 * touches at the bottom). The groups add no URL segment. The one place that knows their names.
 */
export const CHAT_GROUPS: readonly string[] = ['(admin-chat)', '(sales-chat)', '(teacher-chat)'];

/**
 * Is a chat group on top of the root layout's stack (a chat, or a screen opened from one)? The
 * container's root state wraps that stack in expo-router's own '__root' slot.
 */
export function overChat(root: NavState | undefined): boolean {
  const stack = root?.routes[0]?.state;
  if (!stack) return false;
  const top = stack.routes[stack.index ?? stack.routes.length - 1];
  return top ? CHAT_GROUPS.includes(top.name) : false;
}

/** A link to a chat itself (admin, sales or teacher): it opens inside the chat group. */
export function isThreadHref(href: string): boolean {
  return /^\/(sales\/)?inbox\/thread\/|^\/teacher\/chats\/[^/?]+/.test(href);
}
