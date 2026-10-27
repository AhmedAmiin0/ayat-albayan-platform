import { packageProgress, teacherName, type ReportFormEntry, type ReportFormLesson } from '@ab/shared';
import type { ReactNode } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import { useClockCycle, whenIn } from '@/core/lib/clock';

const cities: Record<string, string | undefined> = t.tz;

/** «رقم الحلقة» (R-LES-03), with the package line when the student has one (R-SUB-03). */
function lessonNo(entry: ReportFormEntry): string {
  if (!entry.package) return String(entry.lesson_no);
  const { lessons_used, lessons_total } = entry.package;
  const left = packageProgress(lessons_used, lessons_total, { forms: t.subscriptions.progress });
  return `${entry.lesson_no} · ${left.remainingLabel}`;
}

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const { color } = useTheme();
  const text = (
    <AppText
      style={{
        fontFamily: type.ui[500],
        fontSize: type.size.sm,
        lineHeight: type.lineHeight(type.size.sm),
        color: onPress ? color.lapis : color.ink,
        textDecorationLine: onPress ? 'underline' : 'none',
      }}
    >
      {value}
    </AppText>
  );
  return (
    <View style={{ gap: 2 }}>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>{label}</AppText>
      {onPress ? (
        <Pressable
          accessibilityRole="link"
          onPress={onPress}
          hitSlop={{ top: 12, bottom: 12 }}
          style={{ minHeight: shape.control.touch, justifyContent: 'center' }}
        >
          {text}
        </Pressable>
      ) : (
        text
      )}
    </View>
  );
}

/** The grey read-only panel the identity rows, and the meeting link, sit in. */
function Panel({ children, label }: { children: ReactNode; label: string }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={{ gap: 8, padding: 12, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
    >
      {children}
    </View>
  );
}

/**
 * The read-only identity of the report (R-REP-01, issue D1), in the form's order: «معرّف الطالب»,
 * teacher, student, date in the student's zone, lesson number. All come from the lesson, never
 * typed. «البرنامج» and «الحضور» are questions (ReportEntryCard), then the link (MeetingLink).
 */
export function IdentityBlock({ lesson, entry }: { lesson: ReportFormLesson; entry: ReportFormEntry }) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const { student } = entry;
  const when = `${whenIn(new Date(lesson.starts_at), student.tz, cycle)} (${cities[student.tz] ?? ltr(student.tz)})`;
  return (
    <Panel label={t.reports.identity}>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>{t.reports.readOnlyHint}</AppText>
      <Row label={t.reports.studentId} value={ltr(student.code)} />
      <Row label={t.reports.teacher} value={teacherName(lesson.teacher, locale)} />
      <Row label={t.reports.student} value={student.name} />
      <Row label={t.reports.date} value={when} />
      <Row label={t.reports.lessonNo} value={lessonNo(entry)} />
    </Panel>
  );
}

/** «رابط الاجتماع»: the lesson's link (it opens), read-only; after «الحضور» as on the form. */
export function MeetingLink({ lesson }: { lesson: ReportFormLesson }) {
  const link = lesson.meeting_link;
  const open = link ? () => void Linking.openURL(link) : undefined;
  const shown = link ? ltr(link.replace(/^https?:\/\//, '')) : t.lessons.noLink;
  return (
    <Panel label={t.reports.link}>
      <Row label={t.reports.link} value={shown} onPress={open} />
    </Panel>
  );
}
