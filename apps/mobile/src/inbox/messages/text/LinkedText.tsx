import { splitLinks } from '@ab/shared';
import { useState } from 'react';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { appOpenUrl, STRIPE_FEATURE } from '@/core/lib/stripe-flag';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import type { BubbleActions } from '../hooks/bubble-actions';
import { useSmall } from '../components/MessageMeta';
import { useHoldPress } from './use-hold-press';

interface LinkSpanProps {
  text: string;
  href: string;
  /** The bubble's menu: a nested span takes the touch, so a hold on the link opens it too. */
  onHold: (() => void) | undefined;
  onFail: () => void;
  /** A selectable body copies what it shows: no mark is added then. */
  plain: boolean;
}

/**
 * One link, lapis and underlined. Shown with a trailing LRM so its closing «/» or «.» stays at its
 * end inside an Arabic sentence (display only: the href and the screen reader's name are the text).
 */
function LinkSpan({ text, href, onHold, onFail, plain }: LinkSpanProps) {
  const { color } = useTheme();
  const open = () => {
    // Never crash on a link the phone cannot open: the generic error under the text instead. A pay link
    // in the Stripe test build is marked as opened from the app (its page brings the payer back here).
    Promise.resolve()
      .then(() => Linking.openURL(appOpenUrl(href, STRIPE_FEATURE)))
      .catch(onFail);
  };
  const press = useHoldPress({ onPress: open, onHold });
  return (
    <AppText
      accessibilityRole="link"
      accessibilityLabel={text}
      {...press}
      style={{ color: color.lapis, textDecorationLine: 'underline' }}
    >
      {plain ? text : `${text}\u200E`}
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
 * W11). A link opens in the phone's browser; one that fails says so instead of crashing. The text sits
 * on the side of its own language (ContentText), as WhatsApp, in an Arabic or an English UI.
 */
export function LinkedText({ text, touch, a11y }: LinkedTextProps) {
  const { color } = useTheme();
  const small = useSmall();
  const [failed, setFailed] = useState(false);
  const onHold = touch.has ? touch.openMenu : undefined;
  const parts = splitLinks(text);
  return (
    <>
      <ContentText
        source={text}
        // Selecting text would swallow the long press that opens «رد» / «إعادة توجيه».
        selectable={!touch.has}
        {...(a11y ? touch.a11y : {})}
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
        }}
      >
        {parts.some((part) => part.href)
          ? parts.map((part, i) =>
              part.href ? <LinkSpan key={i} text={part.text} href={part.href} onHold={onHold} onFail={() => setFailed(true)} plain={!touch.has} /> : part.text,
            )
          : text}
      </ContentText>
      {failed ? <AppText accessibilityRole="alert" style={small}>{t.common.error}</AppText> : null}
    </>
  );
}
