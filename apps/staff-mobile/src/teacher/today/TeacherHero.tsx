import type { Hero } from '@ab/client-core';
import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, StatusChip, Button, useNow, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { Note } from '@/core/ui/feedback/Note';
import { heroLead, HeroFrame, lessonClock, studentNames } from '@/today';
import { heroLine } from '@/teacher/lessons/lesson-lines';
import { waiting } from '@/teacher/lessons/teacher-word';
import { TeacherRowAction } from '@/teacher/lessons/TeacherRowAction';
import { useTeacherPlan } from '@/teacher/lessons/use-teacher-plan';
import { earlyLine, heroButtons, heroWord } from './hero-parts';
import { WaitingStrip } from './WaitingStrip';

interface TeacherHeroProps {
  hero: Hero<LessonView>;
  onDetails: () => void;
  onNotice: (text: string) => void;
  onReport: (lessonId: string) => void;
}

/** One filled lead (docs/48); keyed by lesson id so a refused confirm never leaks to the next. */
export function TeacherHero({ hero, onDetails, ...o }: TeacherHeroProps) {
  const { lesson } = hero;
  const now = useNow();
  const clock = { tz: useViewerTz(), cycle: useClockCycle() };
  const { plan, ctx } = useTeacherPlan(lesson, o);
  const { win } = useJoinClassroom(lesson);
  const word = heroWord(hero, now);
  const { lead, peer } = heroButtons(plan);
  const early = earlyLine({ win, way: ctx.way, clock });
  const who = waiting(lesson, now);
  return (
    <HeroFrame
      lead={heroLead(hero)}
      chip={word ? <StatusChip {...word} size="sm" /> : null}
      time={lessonClock(lesson.starts_at, clock.tz, clock.cycle)}
      names={studentNames(lesson)}
      subtitle={heroLine(lesson, clock)}
    >
      {ctx.acts.error ? <ErrorLine message={ctx.acts.error} /> : null}
      {who ? <WaitingStrip who={who} /> : null}
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
