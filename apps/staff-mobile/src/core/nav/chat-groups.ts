/** As much of a navigation state (full or partial) as this file reads. */
export interface NavState {
  index?: number;
  routes: readonly { name: string; state?: NavState }[];
}

/**
 * Each tree's chat (and what a chat opens) is a root route group beside its tabs, so a chat is a
 * full screen above them with no tab bar (react-native-screens#4132: a hidden bar still took the
 * touches at the bottom). The groups add no URL segment. The one place that knows their names.
 */
const CHAT_GROUPS: readonly string[] = ['(admin-chat)', '(sales-chat)', '(teacher-chat)'];

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

/** The in-app room's root routes: the room itself and the channel sheet over it. */
const ROOM_ROUTES: readonly string[] = ['room/[kind]/[id]', 'room-chat/[studentId]'];

/**
 * Is the in-app room on top of the root stack? A tapped push then never navigates: it would stack
 * the tabs over the live lesson (or drop it); the banner and the bell keep the push.
 */
export function overRoom(root: NavState | undefined): boolean {
  const stack = root?.routes[0]?.state;
  const top = stack?.routes[stack.index ?? stack.routes.length - 1];
  return top ? ROOM_ROUTES.includes(top.name) : false;
}

/** A WhatsApp chat (admin, sales or teacher). */
const THREAD = /^\/(sales\/)?inbox\/thread\/|^\/teacher\/chats\/[^/?]+/;

/** A student's teacher–family chat (admin, owning assistant, teacher): in a chat group too. */
const STUDENT_CHAT = /^\/(sales\/)?students\/channel\/[^/?]+|^\/teacher\/more\/messages\/[^/?]+/;

/** A link to a chat itself (a WhatsApp thread or a student chat): it opens in its chat group. */
export function isThreadHref(href: string): boolean {
  return THREAD.test(href) || STUDENT_CHAT.test(href);
}
