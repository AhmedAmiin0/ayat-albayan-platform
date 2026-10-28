import { fillReply, replySlots, type ReplySlot, type SavedReply, type SavedReplyValues } from '@ab/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { Field } from '@/core/ui/form/Field';
import { FillPreview } from './FillPreview';
import { slotKeyboard, slotLabel } from './slot-field';

/** The sheet's test id and the dim's spoken label while it shows the form. */
export const FILL_FRAME = { testID: 'fill-reply-sheet', close: t.savedReplies.fill.close };

interface FillReplyFormProps {
  reply: SavedReply;
  /** The auto placeholders' values: their inputs start with them (still editable). */
  known: SavedReplyValues;
  /** The final text, for the box (exactly as a reply with no blanks); nothing is sent. */
  onInsert: (text: string) => void;
  onCancel: () => void;
}

/** A slot's value: what was typed in it, else the known name (an auto placeholder) or empty (a blank). */
const valueOf = (slot: ReplySlot, typed: Record<string, string>, known: SavedReplyValues): string =>
  typed[slot.key] ?? (slot.kind === 'auto' ? (known[slot.key]?.trim() ?? '') : '');

/**
 * «أكمل الرد» (owner 2026-10-27): one input per blank of the reply, and per placeholder (prefilled),
 * the first one focused; a live preview of the text; «أدرج» puts it in the box (blanks left empty stay
 * as written, to edit there) and «إلغاء» puts nothing. Inputs follow the typed text's direction (a link
 * is LTR). Shown inside the quick-replies sheet's frame (FILL_FRAME): one Modal, swapped content.
 * A name still loading (the profile) fills its input when it arrives, unless already typed over.
 */
export function FillReplyForm({ reply, known, onInsert, onCancel }: FillReplyFormProps) {
  const { color } = useTheme();
  const [slots] = useState(() => replySlots(reply.body));
  const [typed, setTyped] = useState<Record<string, string>>({});
  const values = Object.fromEntries(slots.map((s) => [s.key, valueOf(s, typed, known)]));
  const text = fillReply(reply.body, values);
  return (
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
          onChangeText={(v) => setTyped((now) => ({ ...now, [slot.key]: v }))}
          keyboardType={slotKeyboard(slot)}
          ltr={slotKeyboard(slot) === 'url'}
          autoCapitalize="none"
          autoFocus={i === 0}
        />
      ))}
      <FillPreview text={text} />
      <ButtonRow>
        <Button label={t.savedReplies.fill.insert} onPress={() => onInsert(text)} />
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
      </ButtonRow>
    </ScrollView>
  );
}
