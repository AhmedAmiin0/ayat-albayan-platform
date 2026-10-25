import type { Program } from '@ab/shared';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTrialHistory } from './queries';
import { TrialDateWizard } from './TrialDateWizard';
import { TrialHistoryList } from './TrialHistoryList';

export interface TrialDateFlowProps {
  studentId: string;
  name: string;
  program: Program;
  fallback: () => void;
}

/**
 * Loads the student's trial history first: allowed (no running subscription) → the wizard; a
 * subscriber → the history with «هذا الطالب مشترك…» in place of the action; loading / a failed
 * read → the header over the history's own states.
 */
export function TrialDateFlow({ studentId, name, program, fallback }: TrialDateFlowProps) {
  const { color } = useTheme();
  const history = useTrialHistory(studentId);
  const title = name ? t.trialDate.title.replace('{name}', name) : t.trialDate.action;
  if (history.data?.allowed) {
    return <TrialDateWizard history={history.data} title={title} program={program} fallback={fallback} />;
  }
  const back = () => (router.canGoBack() ? router.back() : fallback());
  return (
    <>
      <ScreenHeader title={title} trailing={<Button variant="ghost" label={t.common.back} onPress={back} />} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {history.data ? (
          <AppText
            accessibilityRole="alert"
            style={{ fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink }}
          >
            {t.trialDate.notAllowed}
          </AppText>
        ) : null}
        <TrialHistoryList history={history.data} onRetry={history.isError ? () => void history.refetch() : undefined} />
      </ScrollView>
    </>
  );
}
