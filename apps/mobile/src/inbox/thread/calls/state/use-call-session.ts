import { CallStore, deriveCall, type CallDerived, type CallSession, type NoticeAction } from '@ab/client-core';
import type { ActiveCallView, CallConfigView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { activeCallsQuery, CALLS_KEY } from '../api/calls-api';
import type { RtcDeps } from '../rtc/media';
import { mobileCalls, peerMaker } from './call-platform';

export interface CallSessionApi extends Pick<CallDerived, 'row' | 'phase' | 'incoming'> {
  store: CallStore;
  session: CallSession | null;
  notice: string | null;
  noticeAction: NoticeAction | null;
}

const NO_ICE: CallConfigView['iceServers'] = [];

/** Back from the background during a call: no foreground service (docs/28 §9), so the mic may have been off. */
function useBackgroundNote(input: { store: CallStore; foreground: boolean; live: boolean }): void {
  const { store, foreground, live } = input;
  const was = useRef(foreground);
  useEffect(() => {
    if (foreground && !was.current && live) store.notify(t.calls.backgrounded);
    was.current = foreground;
  }, [store, foreground, live]);
}

/** The device's call and the incoming rings (docs/28 §3), polled while calls are on and the app is in front. */
export function useCallSession(input: { config: CallConfigView | undefined; rtc: RtcDeps | null; foreground: boolean }): CallSessionApi {
  const client = useQueryClient();
  const [store] = useState(() => new CallStore(mobileCalls, () => void client.invalidateQueries({ queryKey: [...CALLS_KEY] })));
  const state = useSyncExternalStore(store.subscribe, store.get);
  const enabled = input.config?.enabled === true && input.config.canCall;
  const active = useQuery(activeCallsQuery({ enabled, live: state.session !== null, polling: input.foreground }));
  const rows: readonly ActiveCallView[] = useMemo(() => active.data?.rows ?? [], [active.data]);
  const d = deriveCall(state, { rows, startedAt: active.data?.startedAt ?? 0, enabled });
  const live = state.session !== null && !state.session.ended;

  const iceServers = input.config?.iceServers ?? NO_ICE;
  const makePeer = useMemo(() => peerMaker(input.rtc), [input.rtc]);
  useEffect(() => store.configure(makePeer, iceServers), [store, makePeer, iceServers]);
  useEffect(() => () => store.dispose(), [store]);
  useBackgroundNote({ store, foreground: input.foreground, live });

  // WhatsApp's answer, the call gone from the server, the 45 s timer, calls switched off (CallStore.follow).
  const { answer, gone, deadline, off } = d;
  useEffect(() => store.follow({ answer, gone, deadline, off }), [store, answer, gone, deadline, off]);

  const { session, notice, noticeAction } = state;
  return { store, session, row: d.row, phase: d.phase, incoming: d.incoming, notice, noticeAction };
}
