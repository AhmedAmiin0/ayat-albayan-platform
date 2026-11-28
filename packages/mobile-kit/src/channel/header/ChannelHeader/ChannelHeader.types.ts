import type { ReactNode } from 'react';
import type { ChannelRef } from '../../channel-api';

export interface ChannelHeaderProps {
  refs: ChannelRef;
  title: string;
  /** Whose initials the avatar shows (the student, or the family's first other speaker). */
  avatarName: string;
  /** The viewer is listed last; empty while nothing is loaded. */
  names: string;
  trailing?: ReactNode;
}
