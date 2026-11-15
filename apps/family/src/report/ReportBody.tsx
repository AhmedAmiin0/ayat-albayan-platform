import { pageLines } from '@ab/client-core';
import type { ReportPageView } from '@ab/shared';
import { View } from 'react-native';
import { AppText, InsetGroup, locale, raisedCard, t, type, useTheme } from '@ab/mobile-kit';

/** Lines that are the family's to-do: drawn on the gold wash (canvas Report). */
const TODO = new Set(['homework', 'nextPlan']);

/**
 * The report's content (docs/50 §6: the same as the parents' PDF): the overall grade and the
 * teacher, then every line of the form in its order (@ab/client-core pageLines).
 */
export function ReportBody({ view }: { view: ReportPageView }) {
  const { color } = useTheme();
  const text = { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: locale };
  const lines = pageLines(view.report, { text, v1: t.reports });
  const overall = view.report.grade_overall;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ ...raisedCard(color, 16), padding: 16, gap: 4 }}>
        {overall ? (
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.h4, color: color.ok }}>
            {t.enums.grade[overall]}
          </AppText>
        ) : null}
        <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>
          {t.reportPage.teacher.replace('{name}', view.teacher.name)}
        </AppText>
      </View>
      <InsetGroup>
        {lines.map((line) => (
          <View
            key={line.key}
            style={{
              gap: 2,
              padding: 12,
              backgroundColor: TODO.has(line.key) ? color.goldWash : undefined,
            }}
          >
            <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{line.label}</AppText>
            <AppText selectable style={{ color: line.value ? color.ink : color.ink3 }}>
              {line.value ?? t.portal.app.report.blank}
            </AppText>
          </View>
        ))}
      </InsetGroup>
      {view.report.edited_at ? (
        <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
          {t.reportPage.edited}
        </AppText>
      ) : null}
    </View>
  );
}
