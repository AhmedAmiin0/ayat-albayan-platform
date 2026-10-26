import type { CallConfigView } from '@ab/shared';
import { createContext, useContext } from 'react';
import type { CallTarget } from './call-phase';


export interface CallsUi {
  config: CallConfigView;
  /** In a call (or starting one): the phone icon and the call-back entries wait. */
  busy: boolean;
  /** The phone icon / a call entry: checks the permission first, then calls (docs/28 §3.1). */
  call: (target: CallTarget) => void;
}

export const CallsContext = createContext<CallsUi | null>(null);

/**
 * The calls UI when it is on for this user (setting on, allowed to call); null outside the staff
 * shells, while the config loads or fails, and whenever whatsapp_calls_enabled is off.
 */
export function useCalls(): CallsUi | null {
  const ui = useContext(CallsContext);
  return ui && ui.config.enabled && ui.config.canCall ? ui : null;
}

/** The calls log and the chat's call entries need only `enabled` (reading is inbox.read). */
export function useCallsEnabled(): boolean {
  return useContext(CallsContext)?.config.enabled === true;
}
