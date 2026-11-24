import { Redirect, useLocalSearchParams } from 'expo-router';

/** The old attendance log (docs/46 C5) now lives in the student file's lessons (docs/47). */
export default function TeacherAttendanceRedirect() {
  const id = useLocalSearchParams<{ id?: string }>().id ?? '';
  return <Redirect href={`/teacher/reports/student/${id}`} />;
}
