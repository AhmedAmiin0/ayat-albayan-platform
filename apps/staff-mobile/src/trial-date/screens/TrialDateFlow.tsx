import type { Program } from '@ab/catalog';
import { backOr } from '@/core/nav/back-within';
import { ScrollView } from 'react-native';
import { t, type, useTheme, AppText, BackButton, ScreenHeader } from '@ab/mobile-kit';
import { useTrialHistory } from '@/trial-date/lib/queries';
import { TrialDateWizard } from './TrialDateWizard';
import { TrialHistoryList } from '@/trial-date/components/TrialHistoryList';

interface TrialDateFlowProps {
  studentId: string;
  name: string;
  program: Program;
  fallback: () => void;
}

/** A subscriber sees the history with the reason in place of the action. */
export function TrialDateFlow({ studentId, name, program, fallback }: TrialDateFlowProps) {
  const { color } = useTheme();
  const history = useTrialHistory(studentId);
  const title = name ? t.trialDate.title.replace('{name}', name) : t.trialDate.action;
  if (history.data?.allowed) {
    return (
      <TrialDateWizard history={history.data} title={title} program={program} fallback={fallback} />
    );
  }
  const back = () => backOr(fallback);
  return (
    <>
      <ScreenHeader title={title} leading={<BackButton onPress={back} />} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {history.data ? (
          <AppText
            accessibilityRole="alert"
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size.sm,
              lineHeight: type.lineHeight(type.size.sm),
              color: color.ink,
            }}
          >
            {t.trialDate.notAllowed}
          </AppText>
        ) : null}
        <TrialHistoryList
          history={history.data}
          onRetry={history.isError ? () => void history.refetch() : undefined}
        />
      </ScrollView>
    </>
  );
}
