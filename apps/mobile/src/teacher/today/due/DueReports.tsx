import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Button } from '@/core/ui/primitives/Button';
import { AppText } from '@/core/ui/primitives/AppText';
import { InsetGroup } from '@/core/ui/surface/inset';
import { type, useTheme } from '@/theme';
import type { DueReport } from './due-reports';
import { DueRow } from './DueRow';
import { PendingMoreRow } from './PendingMoreRow';

const SHOWN = 3;

interface DueReportsProps {
  rows: readonly DueReport[];
  /** The pending read failed with nothing cached: say so, with a retry. */
  failed: boolean;
  onRetry: () => void;
}

const titleStyle = { fontFamily: type.ui[700], fontSize: 15, lineHeight: 24 } as const;

/**
 * «تقارير لم تُكتب بعد · N» (docs/48) in place of the old banner: three rows in one card, then one
 * row «عرض الباقي (N)» to the pending list. Nothing while it loads or when none is due.
 */
export function DueReports({ rows, failed, onRetry }: DueReportsProps) {
  const { color } = useTheme();
  if (rows.length === 0 && !failed) return null;
  const rest = rows.length - SHOWN;
  // No «· 0» over a failed read: the count is not known.
  const counted = t.teacherToday.pendingTitle.replace('{n}', String(rows.length));
  const title = failed ? t.reports.pending : counted;
  return (
    <View style={{ gap: 8 }} testID="due-reports">
      <AppText
        accessibilityRole="header"
        style={{ ...titleStyle, color: color.ink, fontVariant: ['tabular-nums'] }}
      >
        {title}
      </AppText>
      {failed ? (
        <>
          <ErrorLine message={t.teacherToday.pendingError} />
          <Button variant="secondary" label={t.teacherStudents.retry} onPress={onRetry} />
        </>
      ) : null}
      <InsetGroup>
        {rows.slice(0, SHOWN).map((row) => (
          <DueRow key={row.lessonId} row={row} />
        ))}
        {rest > 0 ? <PendingMoreRow count={rest} /> : null}
      </InsetGroup>
    </View>
  );
}
