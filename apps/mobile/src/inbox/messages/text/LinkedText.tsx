import { splitLinks } from '@ab/shared';
import { useState } from 'react';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import type { BubbleActions } from '../hooks/bubble-actions';
import { useSmall } from '../components/MessageMeta';
import { useHoldPress } from './use-hold-press';

interface LinkSpanProps {
  text: string;
  href: string;
  /** The bubble's menu: a nested span takes the touch, so a hold on the link opens it too. */
  onHold: (() => void) | undefined;
  onFail: () => void;
}

/** One link, lapis and underlined, left to right inside the Arabic sentence. */
function LinkSpan({ text, href, onHold, onFail }: LinkSpanProps) {
  const { color } = useTheme();
  const open = () => {
    // Never crash on a link the phone cannot open: the generic error under the text instead.
    Promise.resolve()
      .then(() => Linking.openURL(href))
      .catch(onFail);
  };
  const press = useHoldPress({ onPress: open, onHold });
  return (
    <AppText
      accessibilityRole="link"
      {...press}
      style={{ color: color.lapis, textDecorationLine: 'underline', writingDirection: 'ltr' }}
    >
      {text}
    </AppText>
  );
}

interface LinkedTextProps {
  text: string;
  touch: BubbleActions;
  /** The screen reader's way to the bubble menu sits on this text. */
  a11y: boolean;
}

/**
 * A bubble's text with its http(s) and www. links clickable (owner 2026-10-26, splitLinks as the web's
 * W11). A link opens in the phone's browser; one that fails says so instead of crashing.
 */
export function LinkedText({ text, touch, a11y }: LinkedTextProps) {
  const { color } = useTheme();
  const small = useSmall();
  const [failed, setFailed] = useState(false);
  const onHold = touch.has ? touch.openMenu : undefined;
  const parts = splitLinks(text);
  return (
    <>
      <AppText
        // Selecting text would swallow the long press that opens «رد» / «إعادة توجيه».
        selectable={!touch.has}
        {...(a11y ? touch.a11y : {})}
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          writingDirection: 'auto',
        }}
      >
        {parts.some((part) => part.href)
          ? parts.map((part, i) =>
              part.href ? <LinkSpan key={i} text={part.text} href={part.href} onHold={onHold} onFail={() => setFailed(true)} /> : part.text,
            )
          : text}
      </AppText>
      {failed ? <AppText accessibilityRole="alert" style={small}>{t.common.error}</AppText> : null}
    </>
  );
}
