import type { PortalStudent } from '@ab/shared';
import { Initial } from '@ab/web-kit/components/family/brand/Initial';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useChildTeacher } from './use-child-teacher';

interface Props {
  student: PortalStudent;
  /** The second, fourth… card's initial is teal (boards). */
  index: number;
  /** This child is the one in view now. */
  current: boolean;
  onChoose: () => void;
}

const TONES = ['green', 'teal'] as const;

/**
 * One child on «حسابي» (board PortalWebAccount): round initial, name, code and the next lesson's
 * teacher; pressing it makes the pages this child's (like «اختر الطالب»).
 */
export function ChildCard({ student, index, current, onChoose }: Props) {
  const teacher = useChildTeacher(student.id);
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-current={current ? 'true' : undefined}
      className={cn('flex min-h-11 w-full cursor-pointer items-center gap-3.5 rounded-2xl border',
        'border-rule bg-[image:var(--fam-wash)] px-4 py-3 text-start',
        'motion-safe:transition-shadow hover:shadow-fam-card',
        current && 'border-[var(--fam-edge-green)]')}
    >
      <Initial name={student.name} size="sm" tone={TONES[index % TONES.length]} />
      <span className="grid min-w-0 gap-0.5">
        <span className="text-base font-extrabold text-ink">{student.name}</span>
        <span className="text-xs text-ink-2">
          <bdi dir="ltr" className="font-latin">{student.code}</bdi>
          {teacher && ` · ${t.portal.app.lesson.teacher.replace('{name}', teacher)}`}
        </span>
        <span className="sr-only">{t.portal.openChild}</span>
      </span>
    </button>
  );
}
