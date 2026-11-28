import type { RoomPlatform } from '../../model/room-types';
import type { useRoomPreview } from '../../state/use-room-preview';

export interface RoomPreviewProps {
  PreviewVideo: RoomPlatform['PreviewVideo'];
  preview: Pick<
    ReturnType<typeof useRoomPreview>,
    'streamUrl' | 'wanted' | 'toggleMic' | 'toggleCam'
  >;
  notice: 'denied' | 'blocked' | null;
  onJoin: () => void;
}
