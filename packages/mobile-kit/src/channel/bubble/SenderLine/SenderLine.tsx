import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { ROLE_INK } from '../role-ink';
import type { SenderLineProps } from './SenderLine.types';
import { senderLabel } from './sender-line.helpers';

/** Over someone else's message: the name in the role's colour, then the role word in ink-3. */
export function SenderLine({ name, role }: SenderLineProps) {
  const { color } = useTheme();
  const word = t.studentChannel.roles[role];
  return (
    <View
      accessible
      accessibilityLabel={senderLabel(name, word)}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}
    >
      {name ? (
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs, true),
            color: color[ROLE_INK[role]],
          }}
        >
          {name}
        </AppText>
      ) : null}
      <AppText
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size.xs, true),
          color: color.ink3,
        }}
      >
        {word}
      </AppText>
    </View>
  );
}
