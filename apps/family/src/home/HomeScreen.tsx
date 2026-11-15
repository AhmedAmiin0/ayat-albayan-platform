import { ownStudent, usePortalMe } from '@/portal';
import { GuardianHome } from './GuardianHome';
import { StudentHome } from './StudentHome';

/**
 * «الرئيسية» (docs/50 §6). A guardian: one card per child. A student: their own page, no list.
 */
export function HomeScreen() {
  const me = usePortalMe();
  const own = me.data ? ownStudent(me.data) : null;
  if (own) return <StudentHome student={own} />;
  return <GuardianHome me={me.data} isError={me.isError} onRetry={() => void me.refetch()} />;
}
