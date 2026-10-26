import { StudentRecordingsScreen } from './StudentRecordingsScreen';

/** The teacher's view of a student's recordings: their own tz, no delete, the API limits it to their students. */
export function TeacherStudentRecordingsScreen() {
  return <StudentRecordingsScreen admin={false} />;
}
