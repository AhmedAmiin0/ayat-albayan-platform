import type { ImageSourcePropType } from 'react-native';
import type { NativeTabsTriggerIconProps } from 'expo-router/unstable-native-tabs';
import inbox from '../../assets/tabs/inbox.png';
import more from '../../assets/tabs/more.png';
import reports from '../../assets/tabs/reports.png';
import schedule from '../../assets/tabs/schedule.png';
import students from '../../assets/tabs/students.png';
import teacherSchedule from '../../assets/tabs/teacher-schedule.png';
import today from '../../assets/tabs/today.png';

// Native tab bar icons (docs/07 §12). iOS draws its own SF Symbol; Android tints these PNGs, which are
// the former SVG line icons (24px, 1.75 stroke) rendered at 1x/2x/3x. Plain image assets: no native
// module is added, so the change ships over the air.
/** An SF Symbol name, as expo-router's native tab icon takes it. */
type SFSymbol = Extract<NonNullable<Extract<NativeTabsTriggerIconProps, { sf?: unknown }>['sf']>, string>;

export type TabIconName = 'today' | 'schedule' | 'teacherSchedule' | 'inbox' | 'students' | 'reports' | 'more';

export const TAB_ICONS: Record<TabIconName, { sf: SFSymbol; src: ImageSourcePropType }> = {
  today: { sf: 'sun.max', src: today },
  schedule: { sf: 'calendar', src: schedule },
  teacherSchedule: { sf: 'calendar', src: teacherSchedule },
  inbox: { sf: 'bubble.left', src: inbox },
  students: { sf: 'person.2', src: students },
  reports: { sf: 'doc.text', src: reports },
  more: { sf: 'line.3.horizontal', src: more },
};
