import { fillReply, replySlots, type ReplySlot, type SavedReply, type SavedReplyValues } from '@ab/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { FillPreview } from './FillPreview';
import { ReplySheetFrame } from './ReplySheetFrame';
import { slotKeyboard, slotLabel } from './slot-field';

interface FillReplySheetProps {
  reply: SavedReply;
  /** The auto placeholders' values: their inputs start with them (still editable). */
  known: SavedReplyValues;
  /** The final text, for the box (exactly as a reply with no blanks); nothing is sent. */
  onInsert: (text: string) => void;
  onCancel: () => void;
}

/** Each slot's starting value: the known name for an auto placeholder, empty for a blank. */
const startValues = (slots: ReplySlot[], known: SavedReplyValues): Record<string, string> =>
  Object.fromEntries(slots.map((s) => [s.key, s.kind === 'auto' ? (known[s.key]?.trim() ?? '') : '']));

/**
 * «أكمل الرد» (owner 2026-10-27): one input per blank of the reply, and per placeholder (prefilled),
 * the first one focused; a live preview of the text; «أدرج» puts it in the box (blanks left empty stay
 * as written, to edit there) and «إلغاء» puts nothing. Inputs follow the typed text's direction.
 */
export function FillReplySheet({ reply, known, onInsert, onCancel }: FillReplySheetProps) {
  const { color } = useTheme();
  const [slots] = useState(() => replySlots(reply.body));
  const [values, setValues] = useState(() => startValues(slots, known));
  const text = fillReply(reply.body, values);
  return (
    <ReplySheetFrame onClose={onCancel} tall name={{ testID: 'fill-reply-sheet', close: t.savedReplies.fill.close }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 32 }}>
        <View style={{ gap: 2 }}>
          <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.lg, lineHeight: type.lineHeight(type.size.lg), color: color.ink }}>
            {t.savedReplies.fill.title}
          </AppText>
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2, writingDirection: 'auto' }}>
            {reply.title}
          </AppText>
        </View>
        {slots.map((slot, i) => (
          <Field
            key={slot.key}
            label={slotLabel(slot)}
            value={values[slot.key] ?? ''}
            onChangeText={(v) => setValues((now) => ({ ...now, [slot.key]: v }))}
            keyboardType={slotKeyboard(slot)}
            autoCapitalize="none"
            autoFocus={i === 0}
          />
        ))}
        <FillPreview text={text} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={t.savedReplies.fill.insert} onPress={() => onInsert(text)} />
          <Button variant="ghost" label={t.common.cancel} onPress={onCancel} />
        </View>
      </ScrollView>
    </ReplySheetFrame>
  );
}
