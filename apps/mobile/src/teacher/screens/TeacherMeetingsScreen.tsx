import { MeetingsScreen } from '@/meetings';
import { useTeacherPageOn } from '@/teacher/lib/teacher-pages';

/** The teacher's «الاجتماعات»: the shared screen with only the start buttons her switches allow. */
export function TeacherMeetingsScreen() {
  const pageOn = useTeacherPageOn();
  const allow = { instant: pageOn('internalMeetings'), scheduled: pageOn('scheduledMeetings') };
  return <MeetingsScreen allow={allow} />;
}
