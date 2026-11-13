import type { TeacherMe } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { LoadError } from './LoadError';

interface ErrorText {
  text: string;
  retry: boolean;
}

/** A login with no teachers row cannot fix it by retrying; any other error can. */
const ERRORS: Partial<Record<string, ErrorText>> = {
  teacher_not_linked: { text: t.teacherDash.notLinked, retry: false },
};
const FALLBACK: ErrorText = { text: t.teacherDash.loadError, retry: true };

/** GET /teachers/me failed with nothing cached: the error from the lookup, retry when it helps. */
export function MeError({ me }: { me: UseQueryResult<TeacherMe> }) {
  const e = ERRORS[errorCode(me.error) ?? ''] ?? FALLBACK;
  return <LoadError text={e.text} onRetry={e.retry ? me.refetch : undefined} />;
}
