import type { ReactNode, Ref } from 'react';
import type { AppTextNode } from '../../primitives/AppText';

export interface ScreenHeaderProps {
  /** Amiri title, e.g. t.mobile.today. Mobile has no cartouche: this is the screen's one title. */
  title: string;
  subtitle?: string;
  /** Only a number the API returned; undefined while it loads. */
  count?: number;
  /** At the inline-end; defaults to the small gold mark. */
  trailing?: ReactNode;
  /** Before the title at the inline-start (the right in Arabic): the screen's BackButton. */
  leading?: ReactNode;
  /** A sheet or dialog takes h2 so the title fits beside close (docs/07 §6). */
  size?: 'h1' | 'h2';
  /** The title's node, e.g. to move screen-reader focus to it when a sheet changes mode. */
  titleRef?: Ref<AppTextNode>;
  /** The reconnecting bar under the title; on for h1. A compact h2 screen passes true. */
  connecting?: boolean;
}
