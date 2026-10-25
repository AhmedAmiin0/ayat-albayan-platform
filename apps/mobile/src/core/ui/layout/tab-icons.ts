import type { ImageSourcePropType } from 'react-native';
import inbox from '../../../../assets/tabs/inbox.png';
import more from '../../../../assets/tabs/more.png';
import reports from '../../../../assets/tabs/reports.png';
import schedule from '../../../../assets/tabs/schedule.png';
import students from '../../../../assets/tabs/students.png';
import teacherSchedule from '../../../../assets/tabs/teacher-schedule.png';
import today from '../../../../assets/tabs/today.png';

// Tab bar icons (docs/07 §12): the former SVG line icons (24px, 1.75 stroke) rendered at 1x/2x/3x,
// tinted by the glass tab bar. Plain image assets imported from JS: they ship over the air.
export type TabIconName = 'today' | 'schedule' | 'teacherSchedule' | 'inbox' | 'students' | 'reports' | 'more';

export const TAB_ICONS: Record<TabIconName, ImageSourcePropType> = {
  today,
  schedule,
  teacherSchedule,
  inbox,
  students,
  reports,
  more,
};
