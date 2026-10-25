import { formatPhone } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { localDate } from '@/today/timeline';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { answerLine } from './feedback-text';
import type { FeedbackListRow } from './types';

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const text = t.mobile.feedback;

/**
 * One «رأيك يهمّنا» answer (or a request still waiting): student and teacher, then the answer as a
 * bold line of its own («5 من 5 · نعم», a filled nuqta) or the hollow «لسه ما ردّش» chip, then the
 * lesson type and day, the note, and the contact number when the API sent it (admins only).
 */
export function FeedbackRow({ row }: { row: FeedbackListRow }) {
  const { color } = useTheme();
  const answer = answerLine(row);
  const who = [row.student.name, row.teacher?.name].filter(Boolean).join(' · ');
  const when = localDate(new Date(row.submitted_at ?? row.requested_at), zone());
  return (
    <View
      accessibilityLabel={who}
      style={{ gap: 4, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}
    >
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>{who}</AppText>
      {answer ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <NuqtaGlyph shape="fill" color={color.ok} />
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>{answer}</AppText>
        </View>
      ) : (
        <StatusChip tone="neutral" glyph="hollow" size="sm" label={text.pending} />
      )}
      <Note>{`${text.kind[row.kind]} · ${ltr(when)}`}</Note>
      {row.note ? (
        <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink }}>{row.note}</AppText>
      ) : null}
      {row.contact_phone ? <Note>{`${text.contact}: ${ltr(formatPhone(row.contact_phone))}`}</Note> : null}
    </View>
  );
}
