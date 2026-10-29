import type { ThreadStudentView } from '@ab/shared';
import { ScrollView, View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { FamilySummary } from './subscription-summary';
import { childChip, dueLine, packageText } from './subscription-words';

/** The panel's small text: xs, tabular digits (a price, «بقيت 6 حلقات»). */
export const LINE = {
  fontFamily: type.ui[500],
  fontSize: type.size.xs,
  lineHeight: type.lineHeight(type.size.xs),
  fontVariant: ['tabular-nums' as const],
};

/** About four rows: a big family scrolls inside the panel, the messages keep the screen. */
const LIST_MAX_HEIGHT = 124;

/**
 * One child as the web panel, display only (the title opens the child's file): «يوسف [غير مدفوع]
 * 8 حلقات في الشهر · بقيت حلقتان عليه 145 ر.س», wrapping onto a second line on a narrow phone.
 */
export function ChildLines({ student }: { student: ThreadStudentView }) {
  const { color } = useTheme();
  const sub = student.subscription;
  const chip = childChip(sub);
  const due = dueLine(sub);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2, flexShrink: 1 }}>
      <AppText style={{ ...LINE, fontFamily: type.ui[600], color: color.ink }}>{student.name}</AppText>
      {chip ? <StatusChip {...chip} size="sm" /> : null}
      <AppText numberOfLines={2} style={{ ...LINE, flexShrink: 1, color: color.ink2 }}>
        {packageText(sub)}
      </AppText>
      {due ? <AppText style={{ ...LINE, fontFamily: type.ui[600], color: color.act }}>{due}</AppText> : null}
    </View>
  );
}

/** The opened family: a line per child with a package, then ONE muted «بلا باقة: …» for the rest. */
export function FamilyList({ packaged, noPackage }: Pick<FamilySummary, 'packaged' | 'noPackage'>) {
  const { color } = useTheme();
  return (
    <ScrollView testID="family-list" style={{ flexGrow: 0, maxHeight: LIST_MAX_HEIGHT }} contentContainerStyle={{ gap: 6 }} nestedScrollEnabled>
      {packaged.map((student) => (
        <ChildLines key={student.id} student={student} />
      ))}
      {noPackage ? (
        <AppText numberOfLines={2} style={{ ...LINE, color: color.ink2 }}>
          {noPackage}
        </AppText>
      ) : null}
    </ScrollView>
  );
}
