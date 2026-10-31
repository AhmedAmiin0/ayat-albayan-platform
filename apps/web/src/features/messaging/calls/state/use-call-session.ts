import { CallStore, deriveCall, type CallDerived, type CallSession } from '@ab/client-core';
import type { ActiveCallView, CallConfigView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { activeCallsQuery, CALLS_KEY } from '@/features/messaging/calls/api/calls-api';
import type { RtcDeps } from '@/features/messaging/calls/rtc/media';
import { peerMaker, webCalls } from './call-platform';

export interface CallSessionApi extends Pick<CallDerived, 'row' | 'phase' | 'incoming'> {
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
  const rows: readonly ActiveCallView[] = active.data?.rows ?? [];
  const d = deriveCall(state, { rows, startedAt: active.data?.startedAt ?? 0, enabled });

  const iceServers = input.config?.iceServers ?? NO_ICE;
  const makePeer = peerMaker(rtc, play);
  useEffect(() => store.configure(makePeer, iceServers), [store, makePeer, iceServers]);
  useEffect(() => () => store.dispose(), [store]);

  // WhatsApp's answer, the call gone from the server, the 45 s timer, calls switched off (CallStore.follow).
  const { answer, gone, deadline, off } = d;
  useEffect(() => store.follow({ answer, gone, deadline, off }), [store, answer, gone, deadline, off]);

  return { store, session: state.session, row: d.row, phase: d.phase, incoming: d.incoming, notice: state.notice };
}
