import { formatPhone } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { localDate } from '@/today/timeline';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { ltr } from '@/ui/Ltr';
import { rowLines } from './feedback-text';
import type { FeedbackListRow } from './types';

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * One «رأيك يهمّنا» answer (or a request still waiting): student and teacher, the lesson type,
 * the rating, «هل ترشّح الأكاديمية؟», the note, the day it came in. The contact number shows only
 * when the API sent it, which it does for admins and never for a teacher's own list.
 */
export function FeedbackRow({ row }: { row: FeedbackListRow }) {
  const { color } = useTheme();
  const [kind, ...rest] = rowLines(row);
  const who = [row.student.name, row.teacher?.name].filter(Boolean).join(' · ');
  const when = localDate(new Date(row.submitted_at ?? row.requested_at), zone());
  return (
    <View
      accessibilityLabel={who}
      style={{ gap: 4, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}
    >
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {who}
      </AppText>
      <Note>{`${kind} · ${ltr(when)}`}</Note>
      {rest.map((line) => (
        <AppText
          key={line}
          style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: row.submitted_at ? color.ink : color.ink3 }}
        >
          {line}
        </AppText>
      ))}
      {row.contact_phone ? (
        <Note>{`${t.mobile.feedback.contact}: ${ltr(formatPhone(row.contact_phone))}`}</Note>
      ) : null}
    </View>
  );
}
