import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { RoomController } from '@/features/teaching/classroom/room/livekit/use-room';

/**
 * «كتمك المعلم» / «أوقف المعلم كاميرتك»: what the muted person sees. They may turn the microphone
 * back on themselves (the control bar's own toggle).
 */
export function useMutedNotice(room: Pick<RoomController, 'onModerated'>): { notice: string | null; dismiss: () => void } {
  const [notice, setNotice] = useState<string | null>(null);
  const { onModerated } = room;
  useEffect(
    () => onModerated((e) => setNotice(e.source === 'microphone' ? t.classroom.mute.byStaff : t.classroom.mute.camByStaff)),
    [onModerated],
  );
  return { notice, dismiss: () => setNotice(null) };
}
