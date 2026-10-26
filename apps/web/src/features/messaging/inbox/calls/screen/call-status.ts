import { formatCallDuration, type ActiveCallView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { talkedSeconds, type CallPhase } from '../state/call-phase';

/** The phase in words, for the live region: announced on a change only, never every second. */
export function callPhaseText(phase: CallPhase): string {
  switch (phase) {
    case 'preparing':
    case 'connecting':
      return t.calls.status.connecting;
    case 'ringing':
      return t.calls.status.ringing;
    case 'accepting':
      return t.calls.status.accepting;
    case 'active':
      return t.calls.entry.live;
    case 'ended':
      return t.calls.status.ended;
  }
}

/** The line under the name: «جارٍ الاتصال…» → «يرنّ…» → «2:14», then «انتهت المكالمة». */
export function callStatusText(phase: CallPhase, input: { row: ActiveCallView | undefined; now: number }): string {
  return phase === 'active' ? formatCallDuration(talkedSeconds(input.row, input.now)) : callPhaseText(phase);
}
