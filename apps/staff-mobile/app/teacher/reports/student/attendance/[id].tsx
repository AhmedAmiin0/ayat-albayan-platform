import { Redirect, useLocalSearchParams } from 'expo-router';

/** The old «سجل الحضور» (docs/46 C5) now lives in the student file's «الحلقات» (docs/47). */
export default function TeacherAttendanceRedirect() {
  const id = useLocalSearchParams<{ id?: string }>().id ?? '';
  return <Redirect href={`/teacher/reports/student/${id}`} />;
}
