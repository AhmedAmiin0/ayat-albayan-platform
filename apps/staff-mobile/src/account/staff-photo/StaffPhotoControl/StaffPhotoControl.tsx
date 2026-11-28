import { useState } from 'react';
import { View } from 'react-native';
import { t, Avatar, Button, AppText, type, useTheme, AccountCard } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { useConfirmFocus } from '@/account/staff-photo/use-confirm-focus';
import { useStaffPhoto } from '@/account/staff-photo/use-staff-photo';
import type { StaffPhotoOptions } from '@/account/staff-photo/staff-photo.types';

const s = t.staffPhoto;

interface StaffPhotoControlProps extends StaffPhotoOptions {
  /** The person's name (the initials, the confirm question). */
  name: string;
}

/** Only shown to who may write it, never for a student or guardian; focus returns after confirm. */
export function StaffPhotoControl({ name, id, ...options }: StaffPhotoControlProps) {
  const { color } = useTheme();
  const photo = useStaffPhoto({ id, ...options });
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
