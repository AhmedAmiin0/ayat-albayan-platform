import { useEffect, type ReactNode } from 'react';
import type { GateStatus } from '@/auth';
import { applyPlaybackMode } from '../rtc/audio-route';
import { CallProvider } from './CallProvider';

/** The staff trees that may call from the chat (docs/28): the admin's, the salesperson's and the teacher's. */
const CALLING: readonly GateStatus[] = ['admin', 'sales', 'teacher'];

/**
 * WhatsApp calls for the signed-in staff tree, mounted once above its stack so an incoming call rings on
 * any screen. Always the same wrapper element, whatever the gate (a sign-in or sign-out never remounts
 * the navigator); for any other gate it asks nothing. A teacher never sees a family's number. At start it
 * sets the app's playback audio mode, the same one every call restores.
 */
export function StaffCalls({ gate, children }: { gate: GateStatus; children: ReactNode }) {
  useEffect(() => {
    void applyPlaybackMode();
  }, []);
  return (
    <CallProvider enabled={CALLING.includes(gate)} showsPhone={gate !== 'teacher'}>
      {children}
    </CallProvider>
  );
}
