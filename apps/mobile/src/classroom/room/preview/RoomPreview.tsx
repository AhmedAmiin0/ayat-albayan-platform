import { View } from 'react-native';
import type { RoomPlatform } from '@/classroom/room/model/room-types';
import type { useRoomPreview } from '@/classroom/room/state/use-room-preview';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { shape, type, useTheme } from '@/theme';
import { CameraButton, MicButton } from './MediaButtons';
import { PreviewNotice } from './PreviewNotice';

const R = t.mobileRoom;

interface RoomPreviewProps {
  PreviewVideo: RoomPlatform['PreviewVideo'];
  preview: Pick<
    ReturnType<typeof useRoomPreview>,
    'streamUrl' | 'wanted' | 'toggleMic' | 'toggleCam'
  >;
  notice: 'denied' | 'blocked' | null;
  onJoin: () => void;
}

/**
 * One's own camera before joining, the mic / camera toggles, the permission notice, «انضم الآن».
 */
export function RoomPreview({ PreviewVideo, preview, notice, onJoin }: RoomPreviewProps) {
  const { color } = useTheme();
  return (
    <View testID="room-preview" style={{ flex: 1, paddingHorizontal: 16, gap: 12 }}>
      <AppText style={{ fontSize: type.size.sm, color: color.coverInk }}>{R.preview.title}</AppText>
      <View
        style={{
          flex: 1,
          borderRadius: shape.radius.lg,
          overflow: 'hidden',
          backgroundColor: color.leatherDeep,
        }}
      >
        {preview.streamUrl ? (
          <PreviewVideo streamUrl={preview.streamUrl} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ color: color.coverInk }}>{R.preview.camOff}</AppText>
          </View>
        )}
      </View>
      {notice ? <PreviewNotice notice={notice} /> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
        <MicButton on={preview.wanted.mic} onPress={preview.toggleMic} />
        <CameraButton on={preview.wanted.cam} onPress={preview.toggleCam} />
      </View>
      <Button label={R.preview.join} onPress={onJoin} />
    </View>
  );
}
