import { Toast } from '@/components/ui/toast';
import type { RoomController } from '../use-room';
import type { MuteController } from './use-mute';
import { useMutedNotice } from './use-muted-notice';

/** The staff's «كُتم ميكروفون {name}» and the muted person's «كتمك المعلم» (one at a time). */
export function MuteToasts({ room, mute }: { room: RoomController; mute: MuteController }) {
  const muted = useMutedNotice(room);
  if (muted.notice) return <Toast message={muted.notice} onDismiss={muted.dismiss} className="bottom-24" />;
  if (mute.toast) return <Toast message={mute.toast.message} tone={mute.toast.tone} onDismiss={mute.dismiss} className="bottom-24" />;
  return null;
}
