import { callEntryKind, formatCallDuration, type ActiveCallView, type CallEntryKind, type CallView } from '@ab/shared';
import { ApiError } from '../http/index.js';
import { talkedSeconds, type CallPhase } from './call-phase.js';

// The calls' sentences, shared by web and mobile. Each app injects its `t.calls`, read on every call
// (the admins' translation overrides land after import).

/** The part of the app's `t.calls` read here. */
export interface CallsText {
  status: { connecting: string; ringing: string; accepting: string; ended: string };
  entry: Record<CallEntryKind, string>;
  mic: { denied: string; unsupported: string };
  /** The API's `code` → its sentence; the three below are always there. */
  errors: Record<string, string> & { no_permission: string; call_failed: string; media_failed: string };
}

/** The API's `code` → its sentence (t.calls.errors); anything else is «تعذّر إجراء المكالمة». */
export function callErrorText(error: unknown, text: CallsText): string {
  const body = error instanceof ApiError ? error.body : null;
  const code = typeof body === 'object' && body !== null && 'code' in body ? String(body.code) : '';
  const known = Object.hasOwn(text.errors, code) ? text.errors[code] : undefined;
  if (known !== undefined) return known;
  if (code.startsWith('permission_')) return text.errors.no_permission;
  return text.errors.call_failed;
}

/** The phase in words, for the live region: announced on a change only, never every second. */
export function callPhaseText(phase: CallPhase, text: CallsText): string {
  switch (phase) {
    case 'preparing':
    case 'connecting':
      return text.status.connecting;
    case 'ringing':
      return text.status.ringing;
    case 'accepting':
      return text.status.accepting;
    case 'active':
      return text.entry.live;
    case 'ended':
      return text.status.ended;
  }
}

/** The line under the name: «جارٍ الاتصال…» → «يرنّ…» → «2:14», then «انتهت المكالمة». */
export function callStatusText(phase: CallPhase, input: { row: ActiveCallView | undefined; now: number; text: CallsText }): string {
  return phase === 'active' ? formatCallDuration(talkedSeconds(input.row, input.now)) : callPhaseText(phase, input.text);
}

/** «مكالمة صوتية صادرة · 2:14», «مكالمة واردة · 0:40», «مكالمة فائتة», «لم يُرَدّ», «مكالمة جارية». */
export function callEntryText(call: CallView, text: CallsText): string {
  const kind = callEntryKind(call);
  const word = text.entry[kind];
  const talked = (kind === 'outgoing' || kind === 'incoming') && call.duration_seconds !== null;
  return talked ? `${word} · ${formatCallDuration(call.duration_seconds ?? 0)}` : word;
}
