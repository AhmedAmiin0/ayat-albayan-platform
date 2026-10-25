import { placeholderToken, SAVED_REPLY_PLACEHOLDERS, type SavedReplyPlaceholder } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { PillButton } from '@/core/ui/primitives/PillButton';

/** `text` with the placeholder put where the cursor is (or replacing the selection). Pure. */
export function insertToken(input: { text: string; key: SavedReplyPlaceholder; selection: { start: number; end: number } }): string {
  const { text, key, selection } = input;
  const start = Math.min(selection.start, text.length);
  const end = Math.min(Math.max(selection.end, start), text.length);
  return `${text.slice(0, start)}${placeholderToken(key)}${text.slice(end)}`;
}

/**
 * «أدرج متغيرًا»: a pill per placeholder (اسم العميل · اسم الطالب · اسمك) and what happens to it; each
 * pill is 36pt with a 44pt hit area.
 */
export function PlaceholderChips({ onInsert }: { onInsert: (key: SavedReplyPlaceholder) => void }) {
  const { color } = useTheme();
  const names: Record<SavedReplyPlaceholder, string> = t.savedReplies.placeholders;
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>{t.savedReplies.placeholdersLabel}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SAVED_REPLY_PLACEHOLDERS.map((key) => (
          <PillButton key={key} label={names[key]} onPress={() => onInsert(key)} />
        ))}
      </View>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: color.ink2 }}>
        {t.savedReplies.placeholdersHint}
      </AppText>
    </View>
  );
}
