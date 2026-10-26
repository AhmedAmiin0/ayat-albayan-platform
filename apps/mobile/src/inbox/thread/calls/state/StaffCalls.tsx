import type { ReactNode } from 'react';
import type { GateStatus } from '@/auth';
import { CallProvider } from './CallProvider';

/** The staff trees that may call from the chat (docs/28): the admin's, the salesperson's and the teacher's. */
const CALLING: readonly GateStatus[] = ['admin', 'sales', 'teacher'];

/**
 * WhatsApp calls for the signed-in staff tree, mounted once above its stack so an incoming call rings on
 * any screen; a teacher never sees a family's number. Every other gate (assistant, signed out) gets none.
 */
export function StaffCalls({ gate, children }: { gate: GateStatus; children: ReactNode }) {
  if (!CALLING.includes(gate)) return children;
  return <CallProvider showsPhone={gate !== 'teacher'}>{children}</CallProvider>;
}
