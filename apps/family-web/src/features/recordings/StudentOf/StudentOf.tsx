import { WithHome } from '@/features/shell';
import { StudentFound } from './StudentFound';
import type { Props } from './StudentOf.types';

/** Another family's student shows not-found; the API would refuse it anyway (404). */
export function StudentOf({ studentId, children }: Props) {
  return (
    <WithHome>
      {(home) => <StudentFound home={home} studentId={studentId} page={children} />}
    </WithHome>
  );
}
