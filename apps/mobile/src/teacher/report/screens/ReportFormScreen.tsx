import { RIYADH_TZ } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, type ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';
import { clockAt } from '@/inbox/shared/format';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTeacherMe } from '../../lib/queries';
import { reportErrorText, useReportForm } from '../hooks/api';
import { ReportEntryCard } from '../components/ReportEntryCard';
import { ReportEntryCardV2 } from '../v2';
import { useClockCycle } from '@/core/lib/clock';

/** The report's own form: the new one (form_version 2), else the Google Form's (v1, unchanged). */
function EntryForm(p: ComponentProps<typeof ReportEntryCard>) {
  return p.entry.report.form_version === 2 ? <ReportEntryCardV2 form={p.form} entry={p.entry} tz={p.tz} /> : <ReportEntryCard {...p} />;
}

const back = () => (router.canGoBack() ? router.back() : router.replace('/teacher/reports'));

/**
 * «تقرير الحلقة» on the phone (R-REP-01/02, R-MOB-02): GET /lessons/:id/report-form, one card per
 * student (a group or siblings), the same questions, rules and API as the web form. Offline the
 * saved form still opens with its «آخر تحديث», and nothing claims to be sent until the API says so.
 */
export function ReportFormScreen() {
  const cycle = useClockCycle();
  const { lessonId = '' } = useLocalSearchParams<{ lessonId: string }>();
  const form = useReportForm(lessonId);
  const tz = useTeacherMe().data?.tz ?? RIYADH_TZ;
  // A saved form is shown only once this open has asked the API (or could not): each card seeds
  // its fields once, and must not seed them from an older copy than the server's draft.
  const data = form.isFetchedAfterMount || form.isError ? form.data : undefined;
  const stale = form.isError && data !== undefined;
  const scroll = useRef<ScrollView>(null);
  const titled = (data?.entries.length ?? 0) > 1;
  return (
    <Screen>
      <ScreenHeader
        title={t.reports.formTitle}
        subtitle={stale ? t.mobile.lastUpdated.replace('{time}', clockAt(form.dataUpdatedAt, cycle)) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {data ? (
        <KeyboardFrame style={{ flex: 1 }}>
          <ScrollView
            ref={scroll}
            style={{ flex: 1, marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 32, paddingHorizontal: 16, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            {data.entries.map((entry) => (
              // Seeded once per server version: a newer version (sent elsewhere) reseeds the card.
              <View key={`${entry.report.id}:${entry.report.version}`} style={{ gap: 12 }}>
                {titled ? <ScreenHeader title={t.reports.entryFor.replace('{name}', entry.student.name)} trailing={null} /> : null}
                <EntryForm form={data} entry={entry} tz={tz} scroll={scroll} />
              </View>
            ))}
          </ScrollView>
        </KeyboardFrame>
      ) : form.isError ? (
        <ErrorState
          onRetry={() => void form.refetch()}
          message={form.error instanceof ApiError ? reportErrorText(form.error) : undefined}
        />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
    </Screen>
  );
}
