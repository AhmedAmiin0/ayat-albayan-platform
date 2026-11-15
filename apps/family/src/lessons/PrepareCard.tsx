import { prepareCard } from '@ab/client-core';
import type { PortalLessons, PortalStudent } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { openReport } from '@/nav';
import { useFamilyClock } from '@/portal';
import { dateLine } from './lesson-text';

interface PrepareCardProps {
  lessons: PortalLessons;
  student: PortalStudent;
  /** The child's «القادمة»: both parts under their titles and a link to the report. */
  full?: boolean;
}

/**
 * «ما المطلوب للحلقة القادمة» (docs/50 §2): the newest sent report's homework and next plan, beside
 * a gold rule. On the home card one line; on the child's page both parts and «من تقرير …».
 */
export function PrepareCard({ lessons, student, full = false }: PrepareCardProps) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const card = prepareCard(lessons);
  if (!card) return null;
  const parts = [
    { key: 'homework', title: t.portal.homework, text: card.homework },
    { key: 'next', title: t.portal.nextPlan, text: card.nextPlan },
  ].filter((p) => p.text !== null);
  const shown = full ? parts : parts.slice(0, 1);
  const from = lessons.prepare?.lesson_starts_at;
  const title = full ? t.portal.app.lesson.prepare : t.portal.prepareTitle;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: color.goldWash,
      }}
    >
      <View style={{ width: 4, borderRadius: 2, backgroundColor: color.gold }} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText
          style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.coverInk }}
        >
          {title}
        </AppText>
        {shown.map((p) => (
          <View key={p.key} style={{ gap: 2 }}>
            {full ? (
              <AppText style={{ fontSize: type.size['2xs'], color: color.ink3 }}>{p.title}</AppText>
            ) : null}
            <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{p.text}</AppText>
          </View>
        ))}
        {full && from ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => openReport({ studentId: student.id, reportId: card.reportId })}
          >
            <AppText
              style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.lapis }}
            >
              {t.portal.app.lesson.fromReport.replace('{date}', dateLine(new Date(from), clock))}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
