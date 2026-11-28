import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText, Button } from '../../../ui';
import { shape, type, useTheme } from '../../../theme';
import { CameraButton } from '../CameraButton';
import { MicButton } from '../MicButton';
import { PreviewNotice } from '../PreviewNotice';
import type { RoomPreviewProps } from './RoomPreview.types';
import { R } from './room-preview.helpers';

/** The first time only: the device choice is kept. */
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
      <View style={{ gap: 4 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.badSolid }} />
          <AppText
            style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.coverInk }}
          >
            {t.classroom.recordedNotice}
          </AppText>
        </View>
        <AppText style={{ fontSize: type.size.xs, color: color.coverInk, textAlign: 'center' }}>
          {R.remember}
        </AppText>
      </View>
      <Button label={R.preview.join} onPress={onJoin} />
    </View>
  );
}
