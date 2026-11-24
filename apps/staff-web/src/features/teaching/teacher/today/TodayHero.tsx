import type { Hero } from '@ab/client-core';
import { counted } from '@ab/core';
import { isOpenLesson, type LessonView, type TeacherMe } from '@ab/schedule';
import { clockOf } from '@ab/time';
import { useId } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { joinHint } from '@/features/teaching/classroom';
import { studentNames, studentTimes } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { type Clock, useClock } from '@ab/web-kit/lib/clock';
import { useJoinWindow } from '@ab/web-kit/lib/settings/public-config';
import { JoinLink } from '@/features/teaching/teacher/lessons/JoinLink';
import { TeacherLessonLead } from '@/features/teaching/teacher/lessons/parts/TeacherLessonLead';
import { useTeacherPlan } from '@/features/teaching/teacher/lessons/parts/use-teacher-plan';

export interface TodayHeroProps {
  /** pickHero over today's lessons; null on a quiet day (or before the lessons load). */
  hero: Hero<LessonView> | null;
  me: TeacherMe;
  /** Her mode: the fixed-link banner shows only off the platform, and only with no hero. */
  platform: boolean;
  onOpen: (lessonId: string) => void;
  onDone: (message: string) => void;
}

interface HeroAt {
  tz: string;
  clock: Clock;
}
type HeroText = (h: Hero<LessonView>, at: HeroAt) => string;
const SOON_MIN = 60;

/** Whole minutes to the start of a coming hero (a running one has none). */
const minutesOf = (h: Hero<LessonView>) => (h.kind === 'next' ? h.minutes : 0);

/** Relative time within the hour, else the start on her clock. */
const nextLine: HeroText = (h, at) =>
  minutesOf(h) <= SOON_MIN
    ? counted(t.today.inMinutes, minutesOf(h))
    : clockOf(new Date(h.lesson.starts_at), { tz: at.tz, ...at.clock });

const HERO_TEXT: Record<Hero['kind'], HeroText> = {
  running: () => t.today.running,
  next: (h, at) => `${t.today.next} · ${nextLine(h, at)}`,
};

/** Without a hero, her fixed link shows (R-TCH-03) unless she uses the platform. */
export function TodayHero({ hero, ...rest }: TodayHeroProps) {
  if (!hero) return rest.platform ? null : <JoinLink link={rest.me.meeting_link} />;
  return <HeroCard hero={hero} {...rest} />;
}

function HeroCard({ hero, me, onOpen, onDone }: TodayHeroProps & { hero: Hero<LessonView> }) {
  const id = useId();
  const clock = useClock();
  const win = useJoinWindow();
  const lesson = hero.lesson;
  const plan = useTeacherPlan(lesson);
  const early = plan.way === 'room' && plan.lead !== 'join' && isOpenLesson(lesson.status);
  const hint = early ? joinHint(lesson, plan.now, { win, cycle: clock.cycle }).hint : null;
  return (
    <section aria-labelledby={id} className="mb-5 grid gap-3 rounded-md border border-rule bg-raised p-4">
      <h2 id={id} className="text-sm font-semibold text-act">{HERO_TEXT[hero.kind](hero, { tz: me.tz, clock })}</h2>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-h2 font-bold tabular-nums">
          {clockOf(new Date(lesson.starts_at), { tz: me.tz, ...clock })}
        </span>
        <span className="text-body font-semibold">{studentNames(lesson)}</span>
      </p>
      {studentTimes(lesson, me.tz, clock).map((line) => (
        <p key={line} className="text-xs text-ink-2">{line}</p>
      ))}
      <ButtonRow>
        {plan.lead && (
          <TeacherLessonLead {...{ action: plan.lead, lesson, plan, onDone }} look={{ filled: true, size: 'lg' }} />
        )}
        <Button type="button" variant="secondary" size="lg" aria-haspopup="dialog" onClick={() => onOpen(lesson.id)}>
          {t.today.details}
        </Button>
      </ButtonRow>
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </section>
  );
}
