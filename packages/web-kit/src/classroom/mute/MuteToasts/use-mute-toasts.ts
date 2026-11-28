import { useMutedNotice } from '@ab/web-kit/classroom/mute/use-muted-notice';
import type { MuteToastsProps } from './MuteToasts.types';

export function useMuteToasts({ room }: Pick<MuteToastsProps, 'room'>) {
  const muted = useMutedNotice(room);
  return { muted };
}
