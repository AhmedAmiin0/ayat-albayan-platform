import type { ReactNode } from 'react';

export interface NoticeAction {
  label: string;
  onPress: () => void;
}

export interface RoomNoticeProps {
  testID: string;
  message: string;
  /** A second, quieter line under the message. */
  detail?: string | undefined;
  presence?: string | null | undefined;
  /** A 40pt icon over the title (ink is the cover's). */
  icon?: ((ink: string) => ReactNode) | undefined;
  /** A wait (checking, joining): a spinner and no buttons. */
  busy?: boolean;
  /** Absent when there is no way back in. */
  again?: NoticeAction | undefined;
  /** Where the app cannot go on (a failure, no LiveKit). */
  browser?: NoticeAction | undefined;
  onBack?: () => void;
}
