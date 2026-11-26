import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText, Button } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { useAnnounce } from '../use-announce';

interface NoticeAction {
  label: string;
  onPress: () => void;
}

interface RoomNoticeProps {
  testID: string;
  message: string;
  /** A second, quieter line under the message. */
  detail?: string | undefined;
  presence?: string | null | undefined;
  /** A 40pt icon over the title (ink is the cover's). */
  icon?: ((ink: string) => ReactNode) | undefined;
  /** A wait (checking, joining): a spinner and no buttons. */
  busy?: boolean;
  /** Absent when there is no way back in. */
  again?: NoticeAction | undefined;
  /** Where the app cannot go on (a failure, no LiveKit). */
  browser?: NoticeAction | undefined;
  onBack?: () => void;
}

/**
 * A step with one line: connecting, a failure, or the room closed (ended, left, dropped, removed,
 * opened elsewhere). The title is a 20pt bold header, announced on iOS.
 */
export function RoomNotice(props: RoomNoticeProps) {
  const { testID, message, detail, busy } = props;
  const { color } = useTheme();
  useAnnounce(message);
  const line = { textAlign: 'center', fontSize: type.size.sm, color: color.coverInk } as const;
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 16,
        backgroundColor: color.cover,
      }}
    >
      {busy ? <ActivityIndicator color={color.coverInk} /> : null}
      {props.icon ? (
        <View style={{ alignItems: 'center' }}>{props.icon(color.coverInk)}</View>
      ) : null}
      <AppText
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={{
          textAlign: 'center',
          fontFamily: type.ui[700],
          fontSize: 20,
          color: color.coverInk,
        }}
      >
        {message}
      </AppText>
      {detail ? <AppText style={line}>{detail}</AppText> : null}
      {props.presence ? <AppText style={line}>{props.presence}</AppText> : null}
      {busy ? null : <NoticeActions {...props} />}
    </View>
  );
}

function NoticeActions(p: Pick<RoomNoticeProps, 'again' | 'browser' | 'onBack'>) {
  const { again, browser, onBack } = p;
  return (
    <>
      {again ? <Button label={again.label} onPress={again.onPress} /> : null}
      {browser ? (
        <Button label={browser.label} variant="secondary" onPress={browser.onPress} />
      ) : null}
      {onBack ? <Button label={t.mobileRoom.back} variant="secondary" onPress={onBack} /> : null}
    </>
  );
}
