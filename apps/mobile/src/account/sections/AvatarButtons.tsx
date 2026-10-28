import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import type { AvatarSource } from '../lib/avatar';

interface AvatarButtonsProps {
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

/**
 * The photo's actions (docs/07 §6 «الأزرار»): with a preview ONE ButtonRow «رفع الصورة» (primary) |
 * «إلغاء» (secondary), else «الكاميرا» | «المعرض» (secondary) and «إزالة الصورة» (danger, full width).
 */
export function AvatarButtons(p: AvatarButtonsProps) {
  const { color } = useTheme();
  const caption = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 };
  if (p.picked) {
    return (
      <View style={{ gap: 8 }}>
        <AppText style={[caption, { textAlign: 'center' }]}>{a.preview}</AppText>
        <ButtonRow>
          <Button label={p.uploading ? a.uploading : a.upload} onPress={p.onUpload} busy={p.uploading} />
          <Button variant="secondary" label={t.account.cancel} onPress={p.onCancel} disabled={p.busy} />
        </ButtonRow>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <ButtonRow>
        <Button variant="secondary" label={a.camera} onPress={() => p.onPick('camera')} disabled={p.busy} />
        <Button variant="secondary" label={a.library} onPress={() => p.onPick('library')} disabled={p.busy} />
      </ButtonRow>
      <AppText style={caption}>{a.hint}</AppText>
      {p.hasPhoto ? (
        <Button variant="danger" label={p.removing ? a.removing : a.remove} onPress={p.onRemove} busy={p.removing} />
      ) : null}
    </View>
  );
}
