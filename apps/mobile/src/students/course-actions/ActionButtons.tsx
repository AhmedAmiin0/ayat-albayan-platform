import type { CourseMoveKind } from '@ab/client-core';
import { useHolds } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

export type Open = 'stop' | CourseMoveKind | null;

interface ActionKeys {
  stop: boolean;
  teacher: boolean;
  times: boolean;
  any: boolean;
}

/** subscriptions.stop, students.change_teacher, courses.reschedule (admin and sales by default). */
export function useActionKeys(): ActionKeys {
  const stop = useHolds('subscriptions.stop');
  const teacher = useHolds('students.change_teacher');
  const times = useHolds('courses.reschedule');
  return { stop, teacher, times, any: stop || teacher || times };
}

/** One button per key held; «إلغاء الاشتراك» last, as the destructive one. */
export function ActionButtons({
  keys,
  onOpen,
}: {
  keys: ActionKeys;
  onOpen: (next: Open) => void;
}) {
  const c = t.courseActions;
  return (
    <>
      {keys.teacher ? (
        <Button variant="secondary" label={c.teacher.action} onPress={() => onOpen('teacher')} />
      ) : null}
      {keys.times ? (
        <Button variant="secondary" label={c.times.action} onPress={() => onOpen('times')} />
      ) : null}
      {keys.stop ? (
        <Button variant="danger" label={c.stop.action} onPress={() => onOpen('stop')} />
      ) : null}
    </>
  );
}
