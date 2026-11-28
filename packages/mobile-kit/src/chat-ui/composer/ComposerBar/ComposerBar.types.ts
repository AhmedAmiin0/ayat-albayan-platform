import type { ReactNode } from 'react';

export interface ComposerBarProps {
  /** The pill's contents in reading order (emoji · text box · attach…), or a recording bar. */
  pill: ReactNode;
  /** The round button at the row's end (RoundAction, maybe wrapped in a hold). */
  action: ReactNode;
  /** A line over the row (a voice note's state). */
  above?: ReactNode;
  /** The pill's least height: 44pt (the staff inbox) unless given (the channel's 48). */
  size?: number;
}
