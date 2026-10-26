import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { Button } from '../primitives/Button';
import { NuqtaGlyph } from '../primitives/NuqtaGlyph';
import { AppText } from '../primitives/AppText';

interface ErrorStateProps {
  /** Usually the query's `refetch`. */
  onRetry: () => void;
  /** Defaults to t.common.error «حصلت مشكلة، حاول تاني». */
  message?: string;
}

/**
 * A read that failed with nothing cached. Show it only when there is no data: with cached data
 * (offline, R-MOB-03) keep the list on screen and stay quiet.
 */
export function ErrorState({ onRetry, message = t.common.error }: ErrorStateProps) {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 24 }}>
      <NuqtaGlyph shape="struck" color={color.bad} size={16} />
      {/* The alert is the sentence, not the box: an accessible box would swallow the retry button. */}
      <AppText
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {message}
      </AppText>
      <Button variant="ghost" label={t.mobile.retry} onPress={onRetry} />
    </View>
  );
}
