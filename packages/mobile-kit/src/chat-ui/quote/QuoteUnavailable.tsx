import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { QUOTE_BOX, QUOTE_LINE } from './quote-style';

/** A quoted message the chat never stored: greyed, nothing to tap. */
export function QuoteUnavailable() {
  const { color } = useTheme();
  return (
    <View
      testID="quote-unavailable"
      style={{ ...QUOTE_BOX, borderStartColor: color.ruleStrong, backgroundColor: color.sunk }}
    >
      <AppText
        numberOfLines={1}
        style={{ ...QUOTE_LINE, fontFamily: type.ui[400], color: color.ink3 }}
      >
        {t.inbox.reply.unavailable}
      </AppText>
    </View>
  );
}
