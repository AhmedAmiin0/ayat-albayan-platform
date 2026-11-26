import { View } from 'react-native';
import { AttachTile } from '../../../chat-ui/composer/AttachTile';
import { CameraIcon, DocumentIcon, GalleryIcon } from '../../../chat-ui/icons/composer-icons';
import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { MenuSheet } from '../../../ui/feedback/MenuSheet';
import { AppText } from '../../../ui/primitives/AppText';

/** Each source the app's port offers; absent → no tile. */
interface AttachSources {
  photo?: () => void;
  camera?: () => void;
  pdf?: () => void;
}

interface AttachSheetProps {
  open: boolean;
  sources: AttachSources;
  onClose: () => void;
}

/** A tile closes the sheet and opens the app's picker. */
export function AttachSheet({ open, sources, onClose }: AttachSheetProps) {
  const { color } = useTheme();
  const m = t.studentChannel.media;
  const run = (action: () => void) => () => {
    onClose();
    action();
  };
  const tiles = [
    { key: 'photo', label: m.gallery, Icon: GalleryIcon, action: sources.photo },
    { key: 'camera', label: m.camera, Icon: CameraIcon, action: sources.camera },
    { key: 'pdf', label: m.document, Icon: DocumentIcon, action: sources.pdf },
  ];
  return (
    <MenuSheet open={open} label={m.attach} testID="channel-attach" onClose={onClose}>
      <View
        style={{
          alignSelf: 'center',
          width: 32,
          height: 4,
          borderRadius: shape.radius.pill,
          backgroundColor: color.rule,
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 }}>
        {tiles.map(({ key, label, Icon, action }) =>
          action ? (
            <AttachTile key={key} label={label} onPress={run(action)}>
              <Icon color={color.lapis} size={26} />
            </AttachTile>
          ) : null,
        )}
      </View>
      <AppText
        style={{
          textAlign: 'center',
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: color.ink3,
        }}
      >
        {m.hint}
      </AppText>
    </MenuSheet>
  );
}
