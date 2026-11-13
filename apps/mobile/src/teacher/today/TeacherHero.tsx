import type { Hero } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { Button } from '@/core/ui/primitives/Button';
import { heroLead, HeroFrame, lessonClock, studentNames } from '@/today';
import { heroLine } from '@/teacher/lessons/lesson-lines';
import { teacherWord } from '@/teacher/lessons/teacher-word';
import { TeacherRowAction } from '@/teacher/lessons/TeacherRowAction';
import { useTeacherPlan } from '@/teacher/lessons/use-teacher-plan';
import { earlyLine, heroButtons } from './hero-parts';

interface TeacherHeroProps {
  hero: Hero<LessonView>;
  onDetails: () => void;
  onNotice: (text: string) => void;
  onReport: (lessonId: string) => void;
}

/**
 * Her lesson under way, else her next one today (docs/48, pickHero), on HeroFrame: the lead line,
 * her word on a next lesson («بانتظار تأكيدك» / «حضورك مؤكَّد»), the time large, then ONE filled
 * lead (lessonPlan), one outlined peer (her link or the report) and «التفاصيل». The screen keys it
 * by lesson id, so a refused «سأحضر» never leaks to the next lesson.
 */
export function TeacherHero({ hero, onDetails, ...o }: TeacherHeroProps) {
  const { lesson } = hero;
  const now = useNow();
  const clock = { tz: useViewerTz(), cycle: useClockCycle() };
  const { plan, ctx } = useTeacherPlan(lesson, o);
  const { win } = useJoinClassroom(lesson);
  const word = hero.kind === 'next' ? teacherWord(lesson, now) : null;
  const { lead, peer } = heroButtons(plan);
  const early = earlyLine({ win, way: ctx.way, clock });
  return (
    <HeroFrame
      lead={heroLead(hero)}
      chip={word ? <StatusChip {...word} size="sm" /> : null}
      time={lessonClock(lesson.starts_at, clock.tz, clock.cycle)}
      names={studentNames(lesson)}
      subtitle={heroLine(lesson, clock)}
    >
      {ctx.acts.error ? <ErrorLine message={ctx.acts.error} /> : null}
      <View style={{ gap: 4 }}>
        <ButtonRow testID="teacher-hero-actions">
          {lead ? <TeacherRowAction action={lead} variant="primary" ctx={ctx} /> : null}
          {peer ? <TeacherRowAction action={peer} variant="secondary" ctx={ctx} /> : null}
          <Button variant="secondary" label={t.today.details} onPress={onDetails} />
        </ButtonRow>
        {early ? <Note>{early}</Note> : null}
      </View>
    </HeroFrame>
  );
}
