import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface PresenceLabelProps {
  /** «متصل الآن» / «آخر ظهور …» / «آخر رسالة …»; '' renders nothing. */
  text: string;
  /** Online now: a small success-toned dot before the words (never colour alone). */
  online?: boolean;
  testID?: string;
}

/** A person's status in one small line (docs/33 §4): the dot only when online. */
export function PresenceLabel({ text, online = false, testID }: PresenceLabelProps) {
  const { color } = useTheme();
  if (!text) return null;
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {online ? (
        <View
          testID="presence-dot"
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.ok }}
        />
      ) : null}
      <AppText
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontFamily: type.ui[500],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: online ? color.ok : color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {text}
      </AppText>
    </View>
  );
}
