import type { PortalStudent } from '@ab/shared';
import { Avatar, Icon, Ltr, Card, Dot, t } from '@ab/web-kit';
import { useChildTeacher } from '@/features/account/use-child-teacher';

interface Props {
  student: PortalStudent;
  /** The child's name, or a self label for a guardian who studies. */
  label: string;
  /** This child is the one the pages show now. */
  current: boolean;
  onChoose: () => void;
}

/** A tap makes the pages this child's. */
export function ChildRow({ student, label, current, onChoose }: Props) {
  const teacher = useChildTeacher(student.id);
  return (
    <Card asChild pressable>
      <button
        type="button"
        onClick={onChoose}
        aria-current={current || undefined}
        className="flex min-h-11 w-full items-center gap-3 p-3"
      >
        <Avatar name={student.name} id={student.id} decorative />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-semibold text-ink">{label}</span>
          <span className="truncate text-xs text-ink-3">
            <Ltr>{student.code}</Ltr>
            {teacher && ` · ${t.portal.app.lesson.teacher.replace('{name}', teacher)}`}
          </span>
        </span>
        {current ? (
          <Dot tone="ok">{t.portal.app.account.inView}</Dot>
        ) : (
          <Icon name="chevron-left" className="size-4 text-ink-3" />
        )}
      </button>
    </Card>
  );
}
