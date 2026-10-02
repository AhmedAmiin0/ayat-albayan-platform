import { lessonWhenText, RIYADH_TZ, type ReportSummaryView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { usePagedList } from '@/lib/use-paged-list';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTeacherMe } from './queries';
import { openSigned } from './report/api';
import { reportFormHref } from './ReportRows';

/** «الحلقة 12 · ممتاز»: the lesson number, then the overall grade or, without grades, the attendance. */
function summaryLine(r: ReportSummaryView): string {
  const no = r.lesson_no === null ? null : t.reports.lessonNoShort.replace('{n}', String(r.lesson_no));
  const grade = r.grade_overall ? t.enums.grade[r.grade_overall] : r.attendance ? t.enums.attendance[r.attendance] : null;
  return [no, grade].filter((part): part is string => part !== null).join(' · ');
}

/**
 * «سجل التقارير» of one of my students (R-REP-05, R-TCH-03): every sent report, newest first, with
 * its PDF once it is ready. The API allows only a student I teach. ponytail: no grade chart here
 * (the web has it); add it when teachers ask.
 */
export function StudentReportsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const me = useTeacherMe();
  const tz = me.data?.tz ?? RIYADH_TZ;
  const name = me.data?.students.find((s) => s.id === id)?.name ?? t.reports.history;
  const list = usePagedList<ReportSummaryView>({ path: `/students/${id}/reports`, pageSize: 10 });
  const [error, setError] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/teacher/reports'));
  return (
    <Screen>
      <ScreenHeader title={name} subtitle={t.reports.history} trailing={<Button variant="ghost" label={t.common.back} onPress={back} />} />
      {error ? <ErrorLine message={t.reports.error.pdf_not_ready} /> : null}
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <ListRow
            title={lessonWhenText(new Date(r.starts_at), tz, locale)}
            subtitle={summaryLine(r)}
            trailing={
              r.pdf_status === 'ready' ? (
                <Button
                  variant="ghost"
                  label={t.reports.downloadPdf}
                  onPress={() => void openSigned(`/reports/${r.id}/pdf`).catch(() => setError(true))}
                />
              ) : undefined
            }
            // Only my own lessons' reports open as a form; another teacher's stays a history line.
            onPress={r.teacher.id === me.data?.id ? () => router.push(reportFormHref(r.lesson_id)) : undefined}
          />
        )}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.data ? <EmptyState title={t.reports.noReports} /> : list.isError ? <ErrorState onRetry={list.refresh} /> : null
        }
      />
    </Screen>
  );
}
