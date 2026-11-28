import type { ReactNode } from 'react';
import type { AudioOutput } from '../../model/audio-output';
import type { RoomPlatform, RoomSnapshot } from '../../model/room-types';
import type { RoomControlsActions } from '../RoomControls';

export interface LiveControls extends RoomControlsActions {
  output: AudioOutput | null;
  front: boolean;
  switchCamera: () => void;
  /** The microphone was turned off by the teacher. */
  mutedByStaff: boolean;
}

export interface RoomLiveProps {
  snap: RoomSnapshot;
  Video: RoomPlatform['Video'];
  controls: LiveControls;
  /** Null means no chat control. */
  chatUnread: number | null;
  /** The panel over the foot: the participants, the leave question, the chat notice. */
  sheet: ReactNode;
}
