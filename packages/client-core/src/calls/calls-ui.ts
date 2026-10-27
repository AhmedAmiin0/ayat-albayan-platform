import type { CallConfigView, CallPermissionState } from '@ab/shared';
import type { CallTarget } from './call-phase.js';

// The calls UI both apps hand down through React context, and the small pure pieces their hooks use.

export interface CallsUi {
  config: CallConfigView;
  /** In a call (or starting one): the phone icon and the call-back entries wait. */
  busy: boolean;
  /** The phone icon / a call entry: checks the permission first, then calls (docs/28 §3.1). */
  call: (target: CallTarget) => void;
}

/**
 * The calls UI when it is on for this user (setting on, allowed to call); null outside the staff
 * shells, while the config loads or fails, and whenever whatsapp_calls_enabled is off.
 */
export const usableCalls = (ui: CallsUi | null): CallsUi | null => (ui && ui.config.enabled && ui.config.canCall ? ui : null);

/** The calls log and the chat's call entries need only `enabled` (reading is inbox.read). */
export const callsReadable = (ui: CallsUi | null): boolean => ui?.config.enabled === true;

/** Why a number cannot be called yet, in the app's `t.calls.permission` words (docs/28 §3.1). */
export function permissionHint(
  state: Exclude<CallPermissionState, 'granted'>,
  text: { requestHint: string; needsTemplate: string; limited: string },
): string {
  if (state === 'request') return text.requestHint;
  return state === 'needs_template' ? text.needsTemplate : text.limited;
}

/** For an effect: rings while `ringing` (an inbound call waits for this user); the cleanup stops it. */
export function ringWhile(ringing: boolean, start: () => { stop(): void }): (() => void) | undefined {
  if (!ringing) return undefined;
  const tone = start();
  return () => tone.stop();
}

/**
 * The call timer's clock for useSyncExternalStore: Date.now() re-read every second, and only while
 * someone listens (`subscribe`; a stopped timer passes `still`); the snapshot is the last tick.
 */
export function secondClock() {
  let now = Date.now();
  return {
    read: (): number => now,
    still: (): (() => void) => () => undefined,
    subscribe: (listener: () => void): (() => void) => {
      now = Date.now();
      const id = setInterval(() => {
        now = Date.now();
        listener();
      }, 1_000);
      return () => clearInterval(id);
    },
  };
}

/** The one clock of the call screens (the full screen and the minimised bar read the same second). */
export const callClock = secondClock();
