import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { type, useTheme } from '@/theme';

interface RoomTopBarProps {
  title: string;
  /** e.g. «عدد المشاركين: 3» while in the room. */
  subtitle?: string | null;
  onBrowser: () => void;
}

/** The room's header: its name, and «فتح في المتصفح» on every step (docs/35 §3). */
export function RoomTopBar({ title, subtitle, onBrowser }: RoomTopBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontSize: type.size.base, color: color.coverInk }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={{ fontSize: type.size.xs, color: color.coverInk, opacity: 0.8 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <PillButton label={t.mobileRoom.openInBrowser} onPress={onBrowser} />
    </View>
  );
}
