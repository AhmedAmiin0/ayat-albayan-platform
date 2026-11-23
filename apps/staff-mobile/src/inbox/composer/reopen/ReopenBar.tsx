import type { WindowBar } from '@ab/client-core';
import type { MessageStatus } from '@ab/shared';
import { View } from 'react-native';
import { t, Button, AppText, shape, type, useTheme } from '@ab/mobile-kit';

type ClosedBar = Exclude<WindowBar, 'open'>;

interface ReopenBarProps {
  bar: ClosedBar;
  /** The live reopen template's tick («sent»). */
  tick: MessageStatus | null;
  /** Staff may still type (a Kapso chat line): the text is held until the reply. */
  held: boolean;
  canReopen: boolean;
  onReopen: () => void;
  /** Shown only with a draft and academy_message usable. */
  onCarry?: (() => void) | null;
}

const TEXT: Record<ClosedBar, string> = {
  reopen: t.inbox.reopenBar.closed,
  sent: t.inbox.reopenBar.sent,
  none_allowed: t.inbox.composer.noAllowedHelp,
};

const tickLine = (tick: MessageStatus | null): string | null =>
  tick ? t.inbox.reopenBar.status.replace('{status}', t.enums.messageStatus[tick]) : null;

/** Shown when the 24 h window has closed. */
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
