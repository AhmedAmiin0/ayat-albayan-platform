import { withReadDeadline as readWithin } from '@ab/client-core';
import { reportStall } from './stall-report';

/**
 * The read deadline around a transport (client-core's, shared with web, docs/43 AU9): a read (GET)
 * that has not settled within the deadline, token included, rejects as no answer (`TypeError`) and
 * tells the connection state once (stall-report). apiFetch uses it, so do the flow tests.
 */
export const withReadDeadline = <T>(
  send: (init: RequestInit) => Promise<T>,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<T> => readWithin(send, init, { timeoutMs, onTimeout: reportStall });
