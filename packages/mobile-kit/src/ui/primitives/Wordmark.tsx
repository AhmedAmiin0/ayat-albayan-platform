import { View } from 'react-native';
import { type } from '../../theme';
import { AppText } from './AppText';

/** The Latin wordmark: large, tight tracking and leading (an Apple-style title); Arabic: never. */
const TITLE = { fontSize: 30, lineHeight: 34, letterSpacing: -0.6 };
const SUBTITLE = type.size.lg;

interface WordmarkProps {
  /** «Ayat Al-Bayan». */
  title: string;
  /** Arabic gets no letter spacing, which would break the joins. */
  subtitle: string;
  color: string;
  /** Noto Sans Arabic is registered (the startup cover can come before it). */
  fontsLoaded?: boolean;
}

/**
 * The app's name as a lockup: the Latin wordmark in the platform's bold face (Noto Sans Arabic has
 * no Latin letters) over the Arabic name. One header for screen readers. Startup cover and sign-in.
 */
export function Wordmark({ title, subtitle, color, fontsLoaded = true }: WordmarkProps) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title}، ${subtitle}`}
      style={{ alignItems: 'center' }}
    >
      <AppText style={{ ...TITLE, fontWeight: '700', color, textAlign: 'center' }}>{title}</AppText>
      <AppText
        style={{
          marginTop: 2,
          fontFamily: fontsLoaded ? type.display : undefined,
          fontSize: SUBTITLE,
          lineHeight: type.lineHeight(SUBTITLE, true),
          color,
          opacity: 0.86,
          textAlign: 'center',
        }}
      >
        {subtitle}
      </AppText>
    </View>
  );
}
