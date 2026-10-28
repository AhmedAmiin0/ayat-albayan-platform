import { subscriptionStatusStyle, type Glyph, type Tone } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useNow } from '@/core/lib/time/use-now';
import { useTreeBase } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import {
  reportHref,
  reportState,
  studentHref,
  type DetailsLesson,
  type DetailsRole,
  type DetailsStudent,
  type ReportState,
} from './details-text';
import { StudentPackageLine } from './StudentPackageLine';

const REPORT: Record<ReportState, { tone: Tone; glyph: Glyph }> = {
  submitted: { tone: 'ok', glyph: 'fill' },
  draft: { tone: 'act', glyph: 'half' },
  none: { tone: 'act', glyph: 'hollow' },
};

/** «الباقة غير مدفوعة» (admin) and the report state, on one wrapping line; nothing when neither. */
function StudentChips({ unpaid, report }: { unpaid: boolean; report: ReportState | null }) {
  if (!unpaid && !report) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {unpaid ? <StatusChip {...subscriptionStatusStyle.unpaid} label={t.subscriptions.unpaidFlag} size="sm" /> : null}
      {report ? <StatusChip {...REPORT[report]} label={t.lessons.sheet.report[report]} size="sm" /> : null}
    </View>
  );
}

interface DetailsStudentRowProps {
  lesson: DetailsLesson;
  student: DetailsStudent;
  role: DetailsRole;
  /** Closes the sheet before a tap navigates. */
  onLeave: () => void;
  /** This student's own file is the screen under the sheet: the name stays plain. */
  here?: boolean;
}

/**
 * One student of the lesson: the name and its «AB-0182» code (a 44pt button to the student file
 * when the role may open it), «الباقة غير مدفوعة», the report state once one can be written, the
 * admin's package line and «عرض التقرير» on a sent report. No phone or guardian contact here.
 */
export function DetailsStudentRow({ lesson, student, role, onLeave, here = false }: DetailsStudentRowProps) {
  const { color } = useTheme();
  const now = useNow();
  const base = useTreeBase();
  const href = here ? null : studentHref(role, student, base);
  const go = (to: string) => {
    onLeave();
    router.push(to);
  };
  // The unpaid flag is the admin's (no teacher screen shows it today).
  const unpaid = role === 'admin' && student.unpaid === true;
  const report = role === 'sales' ? null : reportState(lesson, student, now);
  const toReport = role === 'admin' ? reportHref(role, lesson, student) : null;
  const name = (
    <>
      <AppText
        style={{
          flexShrink: 1,
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
        }}
      >
        {student.name}
      </AppText>
      <Ltr style={{ fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink3 }}>
        {student.code}
      </Ltr>
    </>
  );
  const line = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    minHeight: 44,
  };
  return (
    <View style={{ gap: 4 }}>
      {href ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.lessons.sheet.openStudent.replace('{name}', student.name)}
          onPress={() => go(href)}
          style={({ pressed }) => [line, pressed ? { opacity: 0.7 } : null]}
        >
          {name}
          <View style={{ flex: 1 }} />
          <Chevron to="next" color={color.ink3} size={16} />
        </Pressable>
      ) : (
        <View style={line}>{name}</View>
      )}
      <StudentChips unpaid={unpaid} report={report} />
      {role === 'admin' ? <StudentPackageLine studentId={student.id} /> : null}
      {toReport ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            variant="ghost"
            label={t.reports.view}
            accessibilityLabel={`${t.reports.view} — ${student.name}`}
            onPress={() => go(toReport)}
          />
        </View>
      ) : null}
    </View>
  );
}
