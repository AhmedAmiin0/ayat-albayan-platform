import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { OptionsTitle } from '@/lessons/options/OptionsMenu';
import type { OptionsRender } from './OptionsTrigger';

export type Sheet = 'menu' | 'ask' | null;

export interface LessonOptionsProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** The menu's heading, date line and excuse title. */
  title: OptionsTitle;
  /** What the card says once an action lands. */
  onNotice: (message: string) => void;
  children?: OptionsRender;
}
