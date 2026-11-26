import { prepareCard, type PrepareCard as Prepare } from '@ab/client-core';
import type { PortalLessons, PortalStudent } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { openReport } from '@/nav';
import { useFamilyClock } from '@/portal';
import { dateLine } from '@/lessons/lesson-text';

interface PrepareCardProps {
  lessons: PortalLessons;
  student: PortalStudent;
  /** The child's upcoming tab: both parts under their titles and a link to the report. */
  full?: boolean;
  own?: boolean;
}

/** The card's parts with text: the homework, then the next plan. */
const partsOf = (card: Prepare) =>
  [
    { key: 'homework', title: t.portal.homework, text: card.homework },
    { key: 'next', title: t.portal.nextPlan, text: card.nextPlan },
  ].filter((p) => p.text !== null);

const TITLE: Record<'card' | 'child' | 'own', () => string> = {
  card: () => t.portal.prepareTitle,
  child: () => t.portal.app.lesson.prepare,
  own: () => t.portal.app.lesson.prepareSelf,
};
const titleOf = (full: boolean, own: boolean): string => {
  const key = own ? 'own' : 'child';
  return TITLE[full ? key : 'card']();
};

interface FromReportProps {
  student: PortalStudent;
  reportId: string;
  at: string;
}

function FromReport({ student, reportId, at }: FromReportProps) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const text = t.portal.app.lesson.fromReport.replace('{date}', dateLine(new Date(at), clock));
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={12}
      style={{ minHeight: 44, justifyContent: 'center' }}
      onPress={() => openReport({ studentId: student.id, reportId })}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.lapis }}>
        {text}
      </AppText>
    </Pressable>
  );
}

/** docs/50 §2: the newest sent report's homework and next plan. */
export function PrepareCard({ lessons, student, full = false, own = false }: PrepareCardProps) {
  const { color } = useTheme();
  const card = prepareCard(lessons);
  if (!card) return null;
  const shown = full ? partsOf(card) : partsOf(card).slice(0, 1);
  const from = full ? lessons.prepare?.lesson_starts_at : null;
  const small = { fontSize: type.size['2xs'], color: color.ink3 };
  const box = { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12 } as const;
  return (
    <View style={{ ...box, backgroundColor: color.goldWash }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: color.gold }} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText
          style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.coverInk }}
        >
          {titleOf(full, own)}
        </AppText>
        {shown.map((p) => (
          <View key={p.key} style={{ gap: 2 }}>
            {full ? <AppText style={small}>{p.title}</AppText> : null}
            <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{p.text}</AppText>
          </View>
        ))}
        {from ? <FromReport student={student} reportId={card.reportId} at={from} /> : null}
      </View>
    </View>
  );
}
