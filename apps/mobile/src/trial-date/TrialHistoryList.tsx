import type { TrialHistory } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { HISTORY_CAP } from './history-cap';
import { countText } from './trial-date-text';
import { ShowAll } from './ShowAll';
import { TrialHistoryRow } from './TrialHistoryRow';


export interface TrialHistoryListProps {
  /** GET …/trial-dates; undefined while it loads (or after it failed). */
  history: TrialHistory | undefined;
  /** The read failed: «تعذّر تحميل…» with a retry. */
  onRetry?: () => void;
}

const NONE: Pick<TrialHistory, 'items' | 'family_tz'> = { items: [], family_tz: '' };

type State = 'error' | 'loading' | 'empty' | 'rows';

function stateOf(history: TrialHistory | undefined, failed: boolean): State {
  if (!history) return failed ? 'error' : 'loading';
  return history.items.length === 0 ? 'empty' : 'rows';
}

/**
 * «مواعيد الحلقة التجريبية» (R-STU-05, R-SCH-07): every trial time picked for the student, newest
 * pick first, the count in the header; the first five, then «عرض الكل». Loading, empty and a
 * failed read (with retry) say so.
 */
export function TrialHistoryList({ history, onRetry }: TrialHistoryListProps) {
  const { color } = useTheme();
  const [all, setAll] = useState(false);
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  const { items, family_tz: familyTz } = history ?? NONE;
  const rows = all ? items : items.slice(0, HISTORY_CAP);
  const state = stateOf(history, onRetry !== undefined);
  return (
    <View testID="trial-history" style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <AppText accessibilityRole="header" style={{ ...note, fontFamily: type.ui[600], color: color.ink }}>
          {t.trialDate.historyTitle}
        </AppText>
        {history ? <AppText style={note}>{countText(history.count)}</AppText> : null}
      </View>
      {state === 'error' && onRetry ? <ErrorState message={t.trialDate.loadError} onRetry={onRetry} /> : null}
      {state === 'loading' ? <AppText style={note}>{t.common.loading}</AppText> : null}
      {state === 'empty' ? <AppText style={note}>{t.trialDate.empty}</AppText> : null}
      {rows.map((row) => (
        <TrialHistoryRow key={row.lesson_id} row={row} familyTz={familyTz} />
      ))}
      <ShowAll total={items.length} all={all} onToggle={() => setAll((v) => !v)} />
    </View>
  );
}
