import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { AccountCard } from '../components/AccountCard';
import { useConfirmFocus } from './use-confirm-focus';
import { type StaffPhotoOptions, useStaffPhoto } from './use-staff-photo';

const s = t.staffPhoto;

interface StaffPhotoControlProps extends StaffPhotoOptions {
  /** The person's name (the initials, the confirm question). */
  name: string;
  /** The tone seed (the person's id). */
  id: string;
}

/**
 * «الصورة» on an admin's teacher or user page (owner 2026-10-28): the photo or the initials at 64pt,
 * «تغيير الصورة» (the gallery, square crop) and, with a photo, «حذف الصورة» after an inline confirm.
 * The caller shows it only to who may write it (admin / users.write) and never for a student or guardian.
 * The confirm takes screen-reader focus; cancel or remove gives it back to «تغيير الصورة». The circle is
 * decorative: the screen's header already reads the name.
 */
export function StaffPhotoControl({ name, id, ...options }: StaffPhotoControlProps) {
  const { color } = useTheme();
  const photo = useStaffPhoto(options);
  const [confirming, setConfirming] = useState(false);
  const { confirm, back } = useConfirmFocus(confirming);
  const busy = photo.uploading || photo.removing;
  return (
    <AccountCard title={s.title} error={photo.error ?? undefined} notice={photo.notice ?? undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar name={name} id={id} src={photo.photo} size="lg" decorative />
        <View style={{ flex: 1, gap: 8 }}>
          <Button
            ref={back}
            variant="secondary"
            label={photo.uploading ? s.uploading : s.change}
            busy={photo.uploading}
            disabled={busy}
            onPress={photo.change}
          />
          {photo.photo && !confirming ? (
            <Button
              variant="ghost"
              label={photo.removing ? s.removing : s.remove}
              busy={photo.removing}
              disabled={busy}
              onPress={() => setConfirming(true)}
            />
          ) : null}
        </View>
      </View>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 }}>
        {s.hint}
      </AppText>
      {confirming ? (
        <InlineConfirm
          message={s.confirmRemove.replace('{name}', name)}
          confirmLabel={s.remove}
          confirmRef={confirm}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            photo.remove();
          }}
        />
      ) : null}
    </AccountCard>
  );
}
