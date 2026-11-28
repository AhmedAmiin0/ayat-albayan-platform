import { ActivityIndicator, View } from 'react-native';
import { AppText } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { NoticeActions } from './NoticeActions';
import type { RoomNoticeProps } from './RoomNotice.types';
import { useRoomNotice } from './use-room-notice';

/**
 * A step with one line: connecting, a failure, or the room closed (ended, left, dropped, removed,
 * opened elsewhere). The title is a 20pt bold header, announced on iOS.
 */
export function RoomNotice(props: RoomNoticeProps) {
  const { color } = useTheme();
  const { line } = useRoomNotice(props.message);
  return (
    <View
      testID={props.testID}
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 16,
        backgroundColor: color.cover,
      }}
    >
      {props.busy ? <ActivityIndicator color={color.coverInk} /> : null}
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
        {props.message}
      </AppText>
      {props.detail ? <AppText style={line}>{props.detail}</AppText> : null}
      {props.presence ? <AppText style={line}>{props.presence}</AppText> : null}
      {props.busy ? null : <NoticeActions {...props} />}
    </View>
  );
}
