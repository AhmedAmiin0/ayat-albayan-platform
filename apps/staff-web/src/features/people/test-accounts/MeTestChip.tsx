import { useQuery } from '@tanstack/react-query';
import { meQuery } from '@/features/people/auth';
import { TestChip } from './TestChip';

/** The signed-in family's «تجريبي» (docs/56): shown only when GET /auth/me says is_test. */
export function MeTestChip() {
  const me = useQuery(meQuery);
  return <TestChip when={me.data?.is_test === true} />;
}
