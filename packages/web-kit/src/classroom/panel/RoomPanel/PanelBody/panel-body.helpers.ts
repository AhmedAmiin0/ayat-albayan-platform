/**
 * The chat's scroller. The thread keeps its newest message in view by scrolling an end marker in;
 * the gap (the kit thread's --chat-end-gap) leaves its composer under it in view too, so the reply
 * box is never below the panel's fold.
 */
export const CHAT_BODY =
  'flex min-h-[50dvh] flex-1 flex-col overflow-y-auto [--chat-end-gap:7.5rem] lg:min-h-0';
