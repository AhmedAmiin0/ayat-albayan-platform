import { AVATAR_MAX_BYTES, type AccountProfile } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Avatar, accountMessage, AccountCard, useAccountAction } from '@ab/mobile-kit';
import { removeAvatar, uploadAvatar } from '@/account/hooks/account-api';
import { type AvatarSource, pickAvatar, type PickedAvatar } from '@/account/lib/avatar';
import { AvatarButtons } from './AvatarButtons';

const a = t.account.avatar;

/** R-ACC-05: upload-url, signed upload, then PUT /me/avatar; removing returns to initials. */
export function AvatarSection({ profile }: { profile: AccountProfile }) {
  const [picked, setPicked] = useState<PickedAvatar | null>(null);
  const upload = useAccountAction({
    run: uploadAvatar,
    success: t.account.toast.avatar,
    fallback: 'avatar',
    onDone: () => setPicked(null),
  });
  const remove = useAccountAction({ run: removeAvatar, success: t.account.toast.avatarRemoved, fallback: 'avatar' });
  const busy = upload.pending || remove.pending;

  async function pick(source: AvatarSource) {
    try {
      const photo = await pickAvatar(source);
      if (!photo) return;
      if (photo.size > AVATAR_MAX_BYTES) return upload.reject({ avatar: accountMessage('avatar_too_large') });
      upload.reject({});
      setPicked(photo);
    } catch {
      upload.reject({ avatar: t.account.errors.permission });
    }
  }

  const error = upload.errors.avatar ?? upload.errors.form ?? remove.errors.avatar ?? remove.errors.form;
  return (
    <AccountCard title={a.title} error={error} notice={upload.notice ?? remove.notice}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={profile.full_name} id={profile.avatar_seed ?? profile.id} src={picked?.uri ?? profile.avatar_url} size="lg" />
      </View>
      <AvatarButtons
        picked={picked !== null}
        hasPhoto={profile.avatar_url !== null}
        busy={busy}
        uploading={upload.pending}
        removing={remove.pending}
        onPick={(source) => void pick(source)}
        onUpload={() => picked && upload.submit(picked)}
        onCancel={() => setPicked(null)}
        onRemove={() => remove.submit(undefined)}
      />
    </AccountCard>
  );
}
