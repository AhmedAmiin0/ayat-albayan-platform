import { lessonWait, lessonWaitText } from '@ab/client-core';
import type { PortalLesson, RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { buttonVariants, Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { classroomErrorText } from '@ab/web-kit/classroom/room/livekit/errors';
import { RecordedNotice } from '@ab/web-kit/classroom/recordings/RecordedNotice';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalApi } from '@ab/web-kit/portal/api';
import { useClock } from '@ab/web-kit/lib/clock';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the card opens the room. */
  onJoined: (join: RoomJoinResult) => void;
  /** `hero`: on the family's emerald next-lesson card (a gold full-width pill, light words). */
  tone?: Tone;
}

type Tone = 'plain' | 'hero';

const GOLD =
  'w-full min-h-[52px] rounded-full border-transparent bg-[image:var(--fam-gold-fill)] text-[17px] font-extrabold text-fam-on-gold shadow-[0_8px_20px_rgba(212,165,55,0.35)] hover:not-disabled:brightness-105';

/** Each tone's hint, button extras and box (`plain`: the staff pages' classes, unchanged). */
const LOOK: Record<Tone, { hint: string; button: string; box: string }> = {
  plain: { hint: 'text-sm text-ink-2', button: '', box: 'grid gap-2' },
  hero: {
    hint: 'text-sm text-fam-hero-ink-2',
    button: GOLD,
    box: 'grid gap-2 [&>p:not([role=alert])]:text-fam-hero-ink-2',
  },
};

/** The tone's extras after the base classes; `plain` adds nothing, so its output stays as is. */
const withLook = (base: string, extra: string): string => (extra ? `${base} ${extra}` : base);

/**
 * «ادخل الحلقة», only inside the join window: our classroom admits the student through the API and
 * the room opens here, after «تُسجَّل هذه الجلسة» like every other door into it (consent); an
 * external lesson opens its own meeting link (sent only while it is open).
 */
export function LessonAction({ lesson, studentId, tz, now, onJoined, tone = 'plain' }: Props) {
  const look = LOOK[tone];
  const clock = useClock();
  const join = useMutation({
    mutationFn: () => portalApi.join({ studentId, lessonId: lesson.id }),
    onSuccess: (room) => onJoined(room),
  });
  const wait = lessonWait(lesson, now);
  const hint = wait && lessonWaitText(wait, lesson, { words: t.portal, clock: { ...clock, tz } });
  if (hint) return <p className={look.hint}>{hint}</p>;
  if (lesson.way_in === 'external' && lesson.meeting_url) {
    return (
      <a
        href={lesson.meeting_url}
        target="_blank"
        rel="noopener noreferrer"
        className={withLook(buttonVariants({ size: 'lg' }), look.button)}
      >
        {t.portal.join}
      </a>
    );
  }
  return (
    <div className={look.box}>
      {join.isError && <FormAlert>{classroomErrorText(join.error)}</FormAlert>}
      <RecordedNotice />
      <Button
        type="button"
        size="lg"
        className={withLook('transition-transform active:scale-[0.98]', look.button)}
        disabled={join.isPending}
        onClick={() => join.mutate()}
      >
        {join.isPending ? t.portal.joining : t.portal.join}
      </Button>
    </div>
  );
}
