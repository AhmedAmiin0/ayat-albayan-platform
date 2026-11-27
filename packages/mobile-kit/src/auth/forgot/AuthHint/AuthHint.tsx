import { AppText } from '../../../ui/primitives/AppText';
import { type, useTheme } from '../../../theme';
import type { HintTone, AuthHintProps } from './AuthHint.types';

export function AuthHint({ text, tone = 'quiet' }: AuthHintProps) {
  const { color } = useTheme();
  const ink: Record<HintTone, string> = { quiet: color.ink2, bad: color.bad };
  return (
    <AppText
      accessibilityLiveRegion={tone === 'bad' ? 'polite' : undefined}
      style={{
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: ink[tone],
      }}
    >
      {text}
    </AppText>
  );
}
