import { AVATAR_MAX_BYTES, type AccountProfile } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { removeAvatar, uploadAvatar } from '../hooks/account-api';
import { accountMessage } from '../lib/account-errors';
import { AccountCard } from '../components/AccountCard';
import { type AvatarSource, pickAvatar, type PickedAvatar } from '../lib/avatar';
import { AvatarButtons } from './AvatarButtons';
import { ProfileAvatar } from './ProfileAvatar';
import { useAccountAction } from '../hooks/use-account-action';

const a = t.account.avatar;

/**
 * «الصورة الشخصية» (R-ACC-05): camera or gallery, a preview, then «رفع الصورة» (upload-url →
 * signed upload → PUT /me/avatar); «إزالة الصورة» goes back to the initials.
 */
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
        <ProfileAvatar name={profile.full_name} uri={picked?.uri ?? profile.avatar_url} size={96} />
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
