import { Linking, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** The line under the bar: the tap hint, or the microphone blocked in Settings. */
export type VoiceNote = 'hint' | 'blocked' | null;

/**
 * Under a tap on the microphone: how to record (a hold, not a tap), or, when the microphone is
 * blocked for the app, where to allow it, with «افتح الإعدادات».
 */
export function VoiceNoteLine({ note }: { note: VoiceNote }) {
  const { color } = useTheme();
  if (!note) return null;
  const text = note === 'blocked' ? t.inbox.composer.voice.micBlocked : t.inbox.composer.voice.hint;
  return (
    <View testID="voice-note" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, paddingHorizontal: 4 }}>
      <AppText style={{ flexShrink: 1, fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>{text}</AppText>
      {note === 'blocked' ? (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ minHeight: 44, justifyContent: 'center' }}>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.lapis }}>{t.calls.mic.openSettings}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
