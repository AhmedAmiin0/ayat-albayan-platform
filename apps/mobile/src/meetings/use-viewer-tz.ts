import { RIYADH_TZ } from '@ab/shared';
import { useSegments } from 'expo-router';
import { useTeacherMe } from '@/teacher/lib/queries';

/**
 * The zone meeting times read in (rule 6): a teacher's own tz (GET /teachers/me, as on their other
 * screens); the other trees use the academy's clock, Riyadh, since /auth/me carries no tz.
 */
export function useViewerTz(): string {
  const teacher = useSegments()[0] === 'teacher';
  const me = useTeacherMe(teacher);
  return (teacher ? me.data?.tz : undefined) ?? RIYADH_TZ;
}
