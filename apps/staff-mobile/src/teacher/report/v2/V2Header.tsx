import type { ReportFormEntry, ReportFormLesson } from '@ab/shared';
import { teacherName } from '@ab/schedule';
import { fillSlots } from '@ab/client-core';
import { View } from 'react-native';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t, locale, AppText, ltr, shape, type, useTheme } from '@ab/mobile-kit';
import { Note } from '@/more';

function lessonChip(entry: Pick<ReportFormEntry, 'lesson_no' | 'package'>): string {
  const v2 = t.reports.v2;
  return entry.package
    ? fillSlots(v2.lessonOf, { n: entry.lesson_no, total: entry.package.lessons_total })
    : fillSlots(v2.lessonNo, { n: entry.lesson_no });
}

function Chip({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: shape.radius.pill,
        backgroundColor: color.sunk,
      }}
    >
      <AppText
        style={{
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
        }}
      >
        {children}
      </AppText>
    </View>
  );
}

/** The v2 form's head (R-REP-01): student · code, lesson number, time and teacher, never typed. */
export function V2Header({ lesson, entry }: { lesson: ReportFormLesson; entry: ReportFormEntry }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const { student } = entry;
  return (
    <View accessibilityLabel={t.reports.identity} style={{ gap: 10 }}>
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink2,
        }}
      >
        {`${student.name} · ${ltr(student.code)}`}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip>{lessonChip(entry)}</Chip>
        <Chip>{whenIn(new Date(lesson.starts_at), student.tz, cycle)}</Chip>
        <Chip>
          {fillSlots(t.reports.v2.teacherChip, { name: teacherName(lesson.teacher, locale) })}
        </Chip>
      </View>
      <Note>{t.reports.v2.autoFilled}</Note>
    </View>
  );
}
