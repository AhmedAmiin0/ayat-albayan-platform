import { useQuery } from '@tanstack/react-query';
import { meQuery } from '@ab/web-kit/auth/me';
import { TestChip } from '@ab/web-kit/auth/TestChip';

/** Shown only when GET /auth/me says is_test (docs/56). */
export function MeTestChip() {
  const me = useQuery(meQuery);
  return <TestChip when={me.data?.is_test === true} />;
}
