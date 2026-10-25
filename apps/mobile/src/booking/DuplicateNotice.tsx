import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { shape, type, useTheme } from '@/theme';
import type { Candidate } from './booking-errors';

export interface DuplicateNoticeProps {
  candidates: readonly Candidate[];
  /** Book the child already on file instead (the lead still converts). */
  onUse: (id: string) => void;
  /** It really is a new child: create them anyway (force). */
  onNew: () => void;
  busy: boolean;
}

/**
 * 409 duplicate_student (R-STU-03, issue A1): this parent's number already has a similar-named
 * child, so booking would make a second copy of them.
 */
export function DuplicateNotice({ candidates, onUse, onNew, busy }: DuplicateNoticeProps) {
  const { color } = useTheme();
  const text = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink2,
  };
  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: shape.radius.md,
        backgroundColor: color.actSoft,
      }}
    >
      <AppText
        accessibilityRole="alert"
        style={{ ...text, fontFamily: type.ui[600], color: color.ink }}
      >
        {t.students.duplicateTitle}
      </AppText>
      <AppText style={text}>{t.booking.duplicateNote}</AppText>
      {candidates.map((c) => (
        <View key={c.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText style={{ ...text, fontFamily: type.ui[600], color: color.ink }}>
              {c.name}
            </AppText>
            {c.code ? <Ltr style={{ ...text, color: color.ink3 }}>{c.code}</Ltr> : null}
          </View>
          <Button
            variant="secondary"
            label={t.booking.bookExisting}
            busy={busy}
            onPress={() => onUse(c.id)}
          />
        </View>
      ))}
      <Button variant="ghost" label={t.booking.newAnyway} busy={busy} onPress={onNew} />
    </View>
  );
}
