import { useEffect, useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';

/** The muted person may turn the microphone back on themselves. */
export function useMutedNotice(room: Pick<RoomController, 'onModerated'>): { notice: string | null; dismiss: () => void } {
  const [notice, setNotice] = useState<string | null>(null);
  const { onModerated } = room;
  useEffect(
    () => onModerated((e) => setNotice(e.source === 'microphone' ? t.classroom.mute.byStaff : t.classroom.mute.camByStaff)),
    [onModerated],
  );
  return { notice, dismiss: () => setNotice(null) };
}
