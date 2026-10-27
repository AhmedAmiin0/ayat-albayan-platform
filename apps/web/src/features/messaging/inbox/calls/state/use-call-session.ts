import { CallStore, deriveCall, type CallDerived, type CallSession } from '@ab/client-core';
import type { ActiveCallView, CallConfigView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { activeCallsQuery, CALLS_KEY } from '../api/calls-api';
import type { RtcDeps } from '../rtc/media';
import { peerMaker, webCalls } from './call-platform';

export interface CallSessionApi extends Omit<CallDerived, 'gone' | 'deadline'> {
  store: CallStore;
  session: CallSession | null;
  notice: string | null;
}

const NO_ICE: CallConfigView['iceServers'] = [];

/** The device's call and the incoming rings (docs/28 §3), polled while calls are on for this user. */
export function useCallSession(input: { config: CallConfigView | undefined; rtc: RtcDeps | null; play: (s: MediaStream) => void }): CallSessionApi {
  const client = useQueryClient();
  const { play, rtc } = input;
  const [store] = useState(() => new CallStore(webCalls, () => void client.invalidateQueries({ queryKey: [...CALLS_KEY] })));
  const state = useSyncExternalStore(store.subscribe, store.get);
  const enabled = input.config?.enabled === true && input.config.canCall;
  const active = useQuery(activeCallsQuery({ enabled, live: state.session !== null }));
  const rows: readonly ActiveCallView[] = useMemo(() => active.data?.rows ?? [], [active.data]);
  const d = deriveCall(state, { rows, startedAt: active.data?.startedAt ?? 0 });
  const live = state.session !== null && !state.session.ended;

  const iceServers = input.config?.iceServers ?? NO_ICE;
  const makePeer = useMemo(() => peerMaker(rtc, play), [rtc, play]);
  useEffect(() => store.configure(makePeer, iceServers), [store, makePeer, iceServers]);
  useEffect(() => () => store.dispose(), [store]);

  // Calls switched off (or this user lost inbox.send) during a call: end it (the mic is released).
  useEffect(() => {
    if (!enabled && live) store.hangup();
  }, [store, enabled, live]);

  // WhatsApp's answer, the call gone from the server, the 45 s unanswered timer (CallStore.follow).
  const answer = d.row?.direction === 'outbound' ? d.row.answer_sdp : null;
  const { gone, deadline } = d;
  useEffect(() => store.follow({ answer, gone, deadline }), [store, answer, gone, deadline]);

  return { store, session: state.session, row: d.row, phase: d.phase, incoming: d.incoming, notice: state.notice };
}
