import { useState } from 'react';
import { Image, Pressable } from 'react-native';
import { PhotoViewer } from '../../chat-ui/photo/PhotoViewer';
import { t } from '../../lib/i18n/i18n';
import { shape, useTheme } from '../../theme';

/** A photo's thumb in the bubble; a tap opens it full size (PhotoViewer: pinch, pan, close). */
export function PhotoBubble({ url }: { url: string }) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const label = t.studentChannel.kinds.photo;
  return (
    <>
      <Pressable
        testID="channel-photo"
        accessibilityRole="imagebutton"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
      >
        <Image
          source={{ uri: url }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={{
            width: 240,
            height: 240,
            borderRadius: shape.radius.md,
            backgroundColor: color.sunk,
          }}
        />
      </Pressable>
      {open ? <PhotoViewer uri={url} label={label} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
