import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import type { AvatarSource } from './avatar';

export interface AvatarButtonsProps {
  /** A new photo is in the preview, not uploaded yet. */
  picked: boolean;
  /** The profile has a photo now (removable). */
  hasPhoto: boolean;
  busy: boolean;
  uploading: boolean;
  removing: boolean;
  onPick: (source: AvatarSource) => void;
  onUpload: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

const a = t.account.avatar;

/** The photo's actions: with a preview «رفع الصورة / إلغاء», else camera, gallery and «إزالة الصورة». */
export function AvatarButtons(p: AvatarButtonsProps) {
  const { color } = useTheme();
  const caption = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 };
  if (p.picked) {
    return (
      <View style={{ gap: 8 }}>
        <AppText style={[caption, { textAlign: 'center' }]}>{a.preview}</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label={p.uploading ? a.uploading : a.upload} onPress={p.onUpload} busy={p.uploading} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label={t.account.cancel} onPress={p.onCancel} disabled={p.busy} />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label={a.camera} onPress={() => p.onPick('camera')} disabled={p.busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label={a.library} onPress={() => p.onPick('library')} disabled={p.busy} />
        </View>
      </View>
      <AppText style={caption}>{a.hint}</AppText>
      {p.hasPhoto ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="ghost" label={p.removing ? a.removing : a.remove} onPress={p.onRemove} busy={p.removing} />
        </View>
      ) : null}
    </View>
  );
}
