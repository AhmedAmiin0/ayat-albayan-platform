import type { ReportPageView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { BackButton } from '@/core/ui/navigation';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { ReportFieldRow } from './ReportFieldRow';
import { ReportPageFiles } from './ReportPageFiles';
import { adminReportFields } from './report-v2-fields';
import { useReportPage } from './use-report-page';

const lessonStart = (view: ReportPageView): Date => new Date(view.lesson.starts_at);

const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * «عرض التقرير» (owner 2026-11-06): the report's live page, read-only, for its readers (the
 * student's owning assistant, the teacher, the admin): the saved answers, the teacher's files and
 * the PDF. No edit here, ever.
 */
export function ReportPageScreen() {
  const params = useLocalSearchParams<{ reportId?: string; publicId?: string }>();
  const query = useReportPage(params);
  const cycle = useClockCycle();
  const view = query.data;
  const s = t.reportPage;
  return (
    <Screen>
      <ScreenHeader
        title={s.title}
        subtitle={
          view ? `${view.student.name} · ${whenIn(lessonStart(view), view.tz, cycle)}` : undefined
        }
        leading={<BackButton onPress={back} />}
      />
      {!view && query.isError ? (
        <ErrorState message={s.notFound} onRetry={() => void query.refetch()} />
      ) : null}
      {view ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 32 }}>
          <Note>{s.teacher.replace('{name}', view.teacher.name)}</Note>
          {adminReportFields(view.report).map((f) => (
            <ReportFieldRow key={f.key} field={f} />
          ))}
          {view.report.edited_at ? <Note>{s.edited}</Note> : null}
          <ReportPageFiles view={view} />
        </ScrollView>
      ) : null}
    </Screen>
  );
}
