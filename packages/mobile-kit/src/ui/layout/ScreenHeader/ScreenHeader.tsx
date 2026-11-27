import { View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { HeaderConnectingBar } from '../../connecting/HeaderConnectingBar';
import { Mark } from '../../primitives/Mark';
import { AppText } from '../../primitives/AppText';
import type { ScreenHeaderProps } from './ScreenHeader.types';
import { HeaderLeading } from './HeaderLeading';
import { HeaderTitle } from './HeaderTitle';

export function ScreenHeader({
  title,
  subtitle,
  count,
  trailing = <Mark size={28} />,
  leading,
  size = 'h1',
  titleRef,
  connecting = size === 'h1',
}: ScreenHeaderProps) {
  const { color } = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <HeaderLeading node={leading} />
        <HeaderTitle title={title} count={count} titleRef={titleRef} />
        {trailing}
      </View>
      {subtitle ? (
        <AppText
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs, true),
            color: color.ink2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {subtitle}
        </AppText>
      ) : null}
      {connecting ? <HeaderConnectingBar /> : null}
    </View>
  );
}
