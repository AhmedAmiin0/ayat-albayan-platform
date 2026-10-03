import { lessonWhenText, packageProgress, teacherName, type ReportFormEntry, type ReportFormLesson } from '@ab/shared';
import { Linking, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { ltr } from '@/ui/Ltr';

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

/**
 * The read-only identity of the report (R-REP-01, issue D1): student, teacher, date in the
 * student's zone, lesson number, program and link come from the lesson, never typed.
 */
export function IdentityBlock({ lesson, entry }: { lesson: ReportFormLesson; entry: ReportFormEntry }) {
  const { color } = useTheme();
  const { student } = entry;
  const when = `${lessonWhenText(new Date(lesson.starts_at), student.tz, locale)} (${cities[student.tz] ?? ltr(student.tz)})`;
  const link = lesson.meeting_link;
  return (
    <View
      accessibilityLabel={t.reports.identity}
      style={{ gap: 10, padding: 12, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
    >
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>{t.reports.readOnlyHint}</AppText>
      <Row label={t.reports.student} value={`${student.name} ${ltr(student.code)}`} />
      <Row label={t.reports.teacher} value={teacherName(lesson.teacher, locale)} />
      <Row label={t.reports.date} value={when} />
      <Row label={t.reports.lessonNo} value={lessonNo(entry)} />
      <Row label={t.reports.program} value={t.enums.program[student.program]} />
      {link ? (
        <Row label={t.reports.link} value={ltr(link.replace(/^https?:\/\//, ''))} onPress={() => void Linking.openURL(link)} />
      ) : (
        <Row label={t.reports.link} value={t.lessons.noLink} />
      )}
    </View>
  );
}
