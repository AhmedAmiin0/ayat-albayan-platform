import type { CallView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ThreadView } from '@ab/shared';
import { useHolds } from '@/auth/use-permissions';
import { isOwnThread, useThreadMode } from '../../hooks/thread-mode';
import { callerName } from './call-text';
import { callListQuery } from '../api/calls-api';
import { useCalls, useCallsEnabled } from '../state/call-context';

const NONE: readonly CallView[] = [];

/** One chat's calls for its list; nothing is asked while calls are off (or outside a staff tree). */
export function useThreadCalls(phone: string): readonly CallView[] {
  const enabled = useCallsEnabled();
  return useQuery(callListQuery({ enabled, phone })).data ?? NONE;
}

/**
 * A call entry's «call back», as the header's phone icon allows it: calls on, inbox.send, a loaded chat
 * and never a teacher's own chat; undefined = the entry is plain text.
 */
export function useCallBack(input: { phone: string; thread: ThreadView | null }): ((call: CallView) => void) | undefined {
  const ui = useCalls();
  const mode = useThreadMode();
  const sends = useHolds('inbox.send');
  if (!ui || ui.busy || !sends || input.thread === null || isOwnThread(mode, input.thread)) return undefined;
  return (call) => ui.call({ phone: input.phone, name: callerName(call, mode.kind !== 'teacher') });
}
