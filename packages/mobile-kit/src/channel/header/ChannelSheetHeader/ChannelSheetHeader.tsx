import { View } from 'react-native';
import { CloseIcon } from '../../../chat-ui/icons/chat-glyphs';
import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { IconButton } from '../../../ui/primitives/IconButton';

interface ChannelSheetHeaderProps {
  title: string;
  /** The viewer is listed last; empty while nothing is loaded. */
  names: string;
  onClose: () => void;
}

export function ChannelSheetHeader({ title, names, onClose }: ChannelSheetHeaderProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          alignSelf: 'center',
          width: 32,
          height: 4,
          borderRadius: shape.radius.pill,
          backgroundColor: color.rule,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              fontFamily: type.ui[700],
              fontSize: type.size.lg,
              lineHeight: type.lineHeight(type.size.lg, true),
              color: color.ink,
            }}
          >
            {title}
          </AppText>
          {names ? (
            <AppText
              numberOfLines={1}
              style={{ fontFamily: type.ui[500], fontSize: 12, lineHeight: 19, color: color.ink2 }}
            >
              {names}
            </AppText>
          ) : null}
        </View>
        <IconButton label={t.studentChannel.closeChat} onPress={onClose}>
          <CloseIcon color={color.ink2} />
        </IconButton>
      </View>
    </View>
  );
}
