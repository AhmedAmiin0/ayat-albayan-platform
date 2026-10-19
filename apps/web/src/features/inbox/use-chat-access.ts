import { useQuery } from '@tanstack/react-query';
import { canDo, meQuery } from '@/features/auth/me';
import type { InboxMode } from './mode';

export interface ChatAccess {
  /** The reply box (inbox.send); false shows the read-only line instead. */
  send: boolean;
  /** GET /messaging/templates (messages.read). */
  templates: boolean;
  /** The paperclip (D2): staff who may send; never teachers (the API answers 403 files_forbidden). */
  files: boolean;
}

/**
 * What the chat may offer under an editable sales / teacher role (W12): a known user without the
 * permission gets no reply box and no template read, instead of a generic error. Admin mode is
 * unchanged, and until /auth/me answers (the shells load it first) nothing is hidden: the API checks too.
 */
export function useChatAccess(mode: InboxMode): ChatAccess {
  const me = useQuery(meQuery).data;
  const lacks = (p: 'inbox.send' | 'messages.read') => mode !== 'admin' && !!me && !canDo(me, p);
  const send = !lacks('inbox.send');
  return { send, templates: !lacks('messages.read'), files: send && mode !== 'teacher' };
}
