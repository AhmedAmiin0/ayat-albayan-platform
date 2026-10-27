import { isOpenLesson, type LessonStatus } from '@ab/shared';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useJoinWindow } from '@/lib/settings/public-config';
import { cn } from '@/lib/utils';
import { useNow } from '@/lib/time/use-now';
import { joinHint } from '../room/livekit/window-hint';

export interface JoinableLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  /** «افتح الحلقة الآن»: the room was opened early (the window opens then). */
  room_opened_at?: string | null;
}

interface Props {
  lesson: JoinableLesson;
  size?: 'md' | 'lg';
  className?: string;
  /** The caller's clock, when it has one (StaffJoinButton): both read the same minute. */
  now?: Date;
}

/** «ادخل الحلقة» into the online classroom: enabled inside the settings' window (GET /settings/public) (re-checked every minute), otherwise disabled with «بتفتح الساعة …».
 * A plain link: it works without the router and opens /classroom/:id.
 */
export function EnterButton({ lesson, size = 'md', className, now: given }: Props) {
  const tick = useNow();
  const now = given ?? tick;
  const { canJoin, hint } = joinHint(lesson, now, useJoinWindow());
  return (
    <div className={cn('grid justify-items-start gap-1', className)}>
      {canJoin ? (
        <a href={`/classroom/${lesson.id}`} className={buttonVariants({ variant: 'primary', size })}>
          {t.classroom.enter}
        </a>
      ) : (
        <Button type="button" variant="secondary" size={size} disabled>
          {t.classroom.enter}
        </Button>
      )}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** The same button, but only for a lesson that can still take place (never a moved or cancelled one). */
export function JoinButton({ lesson, ...rest }: Props & { lesson: { status: LessonStatus } }) {
  return isOpenLesson(lesson.status) ? <EnterButton lesson={lesson} {...rest} /> : null;
}
