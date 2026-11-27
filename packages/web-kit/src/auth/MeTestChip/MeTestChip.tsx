import { TestChip } from '@ab/web-kit/auth/TestChip';
import { useMeTestChip } from './use-me-test-chip';

/** Shown only when GET /auth/me says is_test (docs/56). */
export function MeTestChip() {
  const { me } = useMeTestChip();
  return <TestChip when={me.data?.is_test === true} />;
}
