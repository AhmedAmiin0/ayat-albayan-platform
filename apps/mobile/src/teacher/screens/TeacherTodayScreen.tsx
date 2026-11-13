import { router } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { useLessonDetails } from '@/calendar';
import { Screen } from '@/core/ui/layout/Screen';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { TeacherLessonSheet, useTimedNotice } from '@/teacher/lesson-actions';
import { DueReports } from '@/teacher/today/due/DueReports';
import { TeacherDayEnd } from '@/teacher/today/TeacherDayEnd';
import { TeacherHero } from '@/teacher/today/TeacherHero';
import { TodayEnded } from '@/teacher/today/TodayEnded';
import { TodayLoad } from '@/teacher/today/TodayLoad';
import { TodayRest } from '@/teacher/today/TodayRest';
import { useTeacherToday } from '@/teacher/today/use-teacher-today';
import { Notice, TodayHeader } from '@/today';

const toReport = (lessonId: string) => router.push(`/teacher/today/report/${lessonId}`);

/**
 * «اليوم» (R-TCH-03, R-MOB-02, docs/48): one scroll, one pull. Her greeting and date, the notice
 * once an action lands, the hero (pickHero: her lesson under way or next) with ONE lead, the due
 * reports once each, «بقية اليوم» as compact rows (one lead each; a tap opens the sheet with every
 * action), the ended lessons folded, and the day end with her next lesson. Offline the saved day
 * stays with its «آخر تحديث» (R-MOB-03).
 */
export function TeacherTodayScreen() {
  const v = useTeacherToday();
  const notice = useTimedNotice();
  const details = useLessonDetails(v.ahead.data);
  const inset = useTabBarInset();
  const rows = { onOpen: details.open, onReport: toReport, onNotice: notice.show };
  const { day } = v;
  const hero = day.hero;
  return (
    <Screen list>
      <ScrollView
        testID="teacher-today"
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + inset, gap: 16 }}
        refreshControl={<RefreshControl {...v.pull} />}
      >
        <TodayHeader now={v.now} tree="teacher" stale={v.stale} dateLine={v.dateLine} />
        {notice.text ? <Notice message={notice.text} /> : null}
        {hero ? (
          <TeacherHero
            key={hero.lesson.id}
            hero={hero}
            onDetails={() => details.open(hero.lesson)}
            onNotice={notice.show}
            onReport={toReport}
          />
        ) : null}
        <DueReports
          rows={day.due}
          failed={v.pendingFailed}
          onRetry={() => void v.pending.refetch()}
        />
        <TodayRest lessons={day.rest} noOther={day.noOther} rows={rows} />
        <TodayEnded lessons={day.ended} rows={rows} />
        <TeacherDayEnd kind={day.dayEnd} next={day.next} />
        <TodayLoad query={v.ahead} />
      </ScrollView>
      <TeacherLessonSheet
        lesson={details.lesson}
        onClose={details.close}
        onNotice={notice.show}
        onReport={toReport}
      />
    </Screen>
  );
}
