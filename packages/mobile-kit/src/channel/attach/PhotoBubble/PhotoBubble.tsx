import { useState } from 'react';
import { Image, type ImageLoadEvent, Pressable } from 'react-native';
import { PhotoViewer } from '../../../chat-ui/photo/PhotoViewer';
import { t } from '../../../lib/i18n/i18n';
import { shape, useTheme } from '../../../theme';
import { menuA11y } from '../../bubble/menu-a11y';
import { photoRatio } from '../photo-ratio';

interface PhotoBubbleProps {
  url: string;
  /** The message's menu. */
  onLongPress?: () => void;
}

/**
 * A photo's thumb in the bubble, 240pt wide in its own shape (square until it loads); a tap opens
 * it full size (PhotoViewer: pinch, pan, close), a long press the message's menu.
 */
export function PhotoBubble({ url, onLongPress }: PhotoBubbleProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const [ratio, setRatio] = useState(1);
  const label = t.studentChannel.kinds.photo;
  const onLoad = (e: ImageLoadEvent) => setRatio(photoRatio(e.nativeEvent.source));
  return (
    <>
      <Pressable
        testID="channel-photo"
        accessibilityRole="imagebutton"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        onLongPress={onLongPress}
        delayLongPress={350}
        {...menuA11y(onLongPress)}
      >
        <Image
          source={{ uri: url }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onLoad={onLoad}
          style={{
            width: 240,
            aspectRatio: ratio,
            borderRadius: shape.radius.md,
            backgroundColor: color.sunk,
          }}
        />
      </Pressable>
      {open ? <PhotoViewer uri={url} label={label} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
