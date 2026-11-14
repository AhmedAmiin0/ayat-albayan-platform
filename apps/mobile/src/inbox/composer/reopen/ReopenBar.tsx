import type { WindowBar } from '@ab/client-core';
import type { MessageStatus } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme } from '@/theme';

type ClosedBar = Exclude<WindowBar, 'open'>;

interface ReopenBarProps {
  bar: ClosedBar;
  /** The live reopen template's tick («sent»). */
  tick: MessageStatus | null;
  /** Staff may still type (a Kapso chat line): the text is held until the reply. */
  held: boolean;
  /** A chat-line template may be picked: «إعادة فتح المحادثة» shows. */
  canReopen: boolean;
  onReopen: () => void;
  /** «أرسِل الآن داخل قالب» (2026-11-14): shown when set (a draft, academy_message usable). */
  onCarry?: (() => void) | null;
}

const TEXT: Record<ClosedBar, string> = {
  reopen: t.inbox.reopenBar.closed,
  sent: t.inbox.reopenBar.sent,
  none_allowed: t.inbox.composer.noAllowedHelp,
};

const tickLine = (tick: MessageStatus | null): string | null =>
  tick ? t.inbox.reopenBar.status.replace('{status}', t.enums.messageStatus[tick]) : null;

/**
 * The 24 h window closed (owner 2026-11-14, «like Kapso»): one gold-washed bar over (or in place
 * of) the box. «reopen»: why, and «إعادة فتح المحادثة» opening the template sheet; «sent»: the
 * template went, the chat opens on the family's reply (its tick; typed texts are held);
 * «none_allowed»: what this user can do, no button.
 */
export function ReopenBar(props: ReopenBarProps) {
  const { bar, tick, held, canReopen, onReopen, onCarry } = props;
  const { color } = useTheme();
  const small = { fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink };
  const lines = [TEXT[bar], bar === 'sent' ? tickLine(tick) : null];
  const heldLine = bar === 'sent' && held ? t.inbox.reopenBar.held : null;
  return (
    <View
      testID="reopen-bar"
      style={{ gap: 6, padding: 8, borderRadius: shape.radius.md, backgroundColor: color.goldWash }}
    >
      {[...lines, heldLine].map((line) =>
        line ? (
          <AppText key={line} accessibilityLabel={line} style={small}>
            {line}
          </AppText>
        ) : null,
      )}
      {bar === 'reopen' && canReopen ? (
        <Button label={t.inbox.reopenBar.action} onPress={onReopen} />
      ) : null}
      {onCarry ? (
        <Button variant="secondary" label={t.inbox.reopenBar.carry} onPress={onCarry} />
      ) : null}
    </View>
  );
}
