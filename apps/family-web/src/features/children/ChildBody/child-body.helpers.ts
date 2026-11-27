export const PREFIX = 'child';

/**
 * Where the chat's newest message stops when it scrolls in (the kit thread's --chat-end-gap): above
 * its composer and, on a phone, the bottom bar with the safe area, so the reply box stays in view.
 */
export const END_GAP =
  '[--chat-end-gap:calc(9.5rem+env(safe-area-inset-bottom))] shell:[--chat-end-gap:6rem]';
