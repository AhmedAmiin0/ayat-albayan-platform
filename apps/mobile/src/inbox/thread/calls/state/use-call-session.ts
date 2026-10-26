import type { ActiveCallView, CallConfigView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { activeCallsQuery, CALLS_KEY } from '../api/calls-api';
import type { RtcDeps } from '../rtc/media';
import { CallStore } from './call-store';
import { deriveCall, type CallDerived, type CallSession } from './call-phase';

export interface CallSessionApi extends Omit<CallDerived, 'gone' | 'deadline'> {
  store: CallStore;
  session: CallSession | null;
  notice: string | null;
}

const NO_ICE: CallConfigView['iceServers'] = [];

/** The device's call and the incoming rings (docs/28 §3), polled while calls are on and the app is in front. */
export function useCallSession(input: { config: CallConfigView | undefined; rtc: RtcDeps | null; foreground: boolean }): CallSessionApi {
  const client = useQueryClient();
  const { rtc } = input;
  const [store] = useState(() => new CallStore(() => void client.invalidateQueries({ queryKey: [...CALLS_KEY] })));
  const state = useSyncExternalStore(store.subscribe, store.get);
  const enabled = input.config?.enabled === true && input.config.canCall;
  const active = useQuery(activeCallsQuery({ enabled, live: state.session !== null, polling: input.foreground }));
  const rows: readonly ActiveCallView[] = useMemo(() => active.data?.rows ?? [], [active.data]);
  const d = deriveCall(state, { rows, startedAt: active.data?.startedAt ?? 0 });

  const iceServers = input.config?.iceServers ?? NO_ICE;
  useEffect(() => store.configure(rtc, iceServers), [store, rtc, iceServers]);
  useEffect(() => () => store.dispose(), [store]);

  // WhatsApp's answer to our offer arrived (connect webhook): apply it once.
  const answer = d.row?.direction === 'outbound' ? d.row.answer_sdp : null;
  useEffect(() => {
    if (answer) store.applyAnswer(answer);
  }, [store, answer]);

  // The server no longer lists the call: it ended (hung up, rejected, missed, swept).
  useEffect(() => {
    if (d.gone) store.serverEnded();
  }, [store, d.gone]);

  // Unanswered for 45 s from the server id: end it here too (the API's sweeper does the same).
  const { deadline } = d;
  useEffect(() => {
    if (deadline === null) return;
    const id = setTimeout(() => store.hangup(), Math.max(0, deadline - Date.now()));
    return () => clearTimeout(id);
  }, [store, deadline]);

  return { store, session: state.session, row: d.row, phase: d.phase, incoming: d.incoming, notice: state.notice };
}
