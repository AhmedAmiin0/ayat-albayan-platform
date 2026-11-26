import { Linking, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText, Button } from '../../../ui';
import { type, useTheme } from '../../../theme';

const P = t.mobileRoom.permission;

/** Joining goes on without it; a permanent refusal offers the settings. */
export function PreviewNotice({ notice }: { notice: 'denied' | 'blocked' }) {
  const { color } = useTheme();
  return (
    <View testID={`room-notice-${notice}`} style={{ gap: 8 }}>
      <AppText
        accessibilityLiveRegion="polite"
        style={{ fontSize: type.size.sm, color: color.coverInk }}
      >
        {notice === 'blocked' ? P.blocked : P.denied}
      </AppText>
      {notice === 'blocked' ? (
        <Button
          label={P.openSettings}
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
    </View>
  );
}
