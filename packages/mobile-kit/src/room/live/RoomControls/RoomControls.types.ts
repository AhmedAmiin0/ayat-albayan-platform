import type { AudioOutput } from '../../model/audio-output';

export interface RoomControlsState {
  micOn: boolean;
  camOn: boolean;
  output: AudioOutput | null;
  /** Null means no chat control in this room. */
  chatUnread: number | null;
}

export interface RoomControlsActions {
  toggleMic: () => void;
  toggleCam: () => void;
  nextOutput: () => void;
  openChat: () => void;
  leave: () => void;
}

export interface RoomControlsProps {
  state: RoomControlsState;
  actions: RoomControlsActions;
}
