import type { CallPermissionReply, CallPermissionState, CallPermissionView } from '@ab/shared';

// The permission sheet (docs/28 §3.1, §10), shared by web and mobile: what GET /calls/permission
// said when the call cannot start yet, and its words from the app's `t.calls.permission`.

/** The sheet's subject: the number and the (not granted) answer. */
export type PermissionAsk = Omit<CallPermissionView, 'state' | 'expires_at'> & {
  phone: string;
  state: Exclude<CallPermissionState, 'granted'>;
};

/** The part of `t.calls.permission` read here. */
export interface PermissionWords {
  requestHint: string;
  needsTemplate: string;
  limited: string;
  viaTemplate: string;
  noTemplate: string;
  replyRejected: string;
  replyAccepted: string;
}

/** null = granted (the call starts); else the sheet's subject. */
export function askOf(phone: string, view: CallPermissionView): PermissionAsk | null {
  if (view.state === 'granted') return null;
  return {
    phone,
    state: view.state,
    ...(view.via ? { via: view.via } : {}),
    ...(view.reply !== undefined ? { reply: view.reply } : {}),
  };
}

/**
 * Why a number cannot be called yet. A calls number (docs/28 §10) outside its 24 h window asks with
 * the template of calls_permission_template (`via` template), or says that setting is empty.
 */
export function permissionHint(
  ask: Pick<PermissionAsk, 'state' | 'via'>,
  text: PermissionWords,
): string {
  const template = ask.via === 'template';
  if (ask.state === 'request') return template ? text.viaTemplate : text.requestHint;
  if (ask.state === 'needs_template') return template ? text.noTemplate : text.needsTemplate;
  return text.limited;
}

/**
 * The family's last answer on the calls number, «… ({{at}})» with the app's date words; null =
 * none.
 */
export function permissionReplyText(
  reply: CallPermissionReply | null | undefined,
  input: { text: PermissionWords; at: (iso: string) => string },
): string | null {
  if (!reply) return null;
  const words = reply.response === 'rejected' ? input.text.replyRejected : input.text.replyAccepted;
  return words.replace('{{at}}', input.at(reply.at));
}
