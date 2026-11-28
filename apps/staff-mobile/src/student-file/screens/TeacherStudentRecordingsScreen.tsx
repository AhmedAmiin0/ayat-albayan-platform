import { StudentRecordingsScreen } from './StudentRecordingsScreen';

/** Teacher's view: their own tz, no delete; the API limits it to their students. */
export function TeacherStudentRecordingsScreen() {
  return <StudentRecordingsScreen admin={false} />;
}
