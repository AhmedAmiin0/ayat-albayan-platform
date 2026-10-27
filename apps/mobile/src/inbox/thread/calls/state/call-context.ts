import { callsReadable, usableCalls, type CallsUi } from '@ab/client-core';
import { createContext, useContext } from 'react';

export const CallsContext = createContext<CallsUi | null>(null);
/** The calls UI when it is on for this user, else null; the calls log and the entries need only `enabled`. */
export const useCalls = (): CallsUi | null => usableCalls(useContext(CallsContext));
export const useCallsEnabled = (): boolean => callsReadable(useContext(CallsContext));
