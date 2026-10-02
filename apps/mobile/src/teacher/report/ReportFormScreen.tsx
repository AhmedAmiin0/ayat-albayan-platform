import { RIYADH_TZ } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { clockAt } from '@/inbox/format';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTeacherMe } from '../queries';
import { reportErrorText, useReportForm } from './api';
import { ReportEntryCard } from './ReportEntryCard';

const back = () => (router.canGoBack() ? router.back() : router.replace('/teacher/reports'));

/**
 * «تقرير الحلقة» on the phone (R-REP-01/02, R-MOB-02): GET /lessons/:id/report-form, one card per
 * student (a group or siblings), the same questions, rules and API as the web form. Offline the
 * saved form still opens with its «آخر تحديث», and nothing claims to be sent until the API says so.
 */
export function ReportFormScreen() {
  const { lessonId = '' } = useLocalSearchParams<{ lessonId: string }>();
  const form = useReportForm(lessonId);
  const tz = useTeacherMe().data?.tz ?? RIYADH_TZ;
  // A saved form is shown only once this open has asked the API (or could not): each card seeds
  // its fields once, and must not seed them from an older copy than the server's draft.
  const data = form.isFetchedAfterMount || form.isError ? form.data : undefined;
  const stale = form.isError && data !== undefined;
  const titled = (data?.entries.length ?? 0) > 1;
  return (
    <Screen>
      <ScreenHeader
        title={t.reports.formTitle}
        subtitle={stale ? t.mobile.lastUpdated.replace('{time}', clockAt(form.dataUpdatedAt)) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {data ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1, marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 32, paddingHorizontal: 16, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            {data.entries.map((entry) => (
              // Seeded once per server version: a newer version (sent elsewhere) reseeds the card.
              <View key={`${entry.report.id}:${entry.report.version}`} style={{ gap: 12 }}>
                {titled ? <ScreenHeader title={t.reports.entryFor.replace('{name}', entry.student.name)} trailing={null} /> : null}
                <ReportEntryCard form={data} entry={entry} tz={tz} />
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : form.isError ? (
        <ErrorState
          onRetry={() => void form.refetch()}
          message={form.error instanceof ApiError ? reportErrorText(form.error) : undefined}
        />
      ) : null}
    </Screen>
  );
}
