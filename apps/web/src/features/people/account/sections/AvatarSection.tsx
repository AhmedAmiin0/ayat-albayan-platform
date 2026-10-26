import { useState, type ChangeEvent } from 'react';
import { Avatar } from '@/components/ui/display/avatar';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { AccountSection } from './AccountSection';
import { removeAvatar, uploadAvatar } from '../api';
import { AvatarActions } from './AvatarActions';
import { avatarFileProblem } from '../avatar-file';
import { accountMessage } from '../errors';
import type { SectionProps } from './section-props';
import { useAccountSave } from '../use-account-save';
import { usePickedFile } from '../use-picked-file';

const A = t.account.avatar;

/**
 * R-ACC-05: pick a photo (checked here first: JPG/PNG/WebP, 2 MB at most), see it, then upload it;
 * or remove the saved one. Without a photo the initials show. The saved photo's alt names the user.
 */
export function AvatarSection({ profile, onDone }: SectionProps) {
  const [picked, setPicked] = usePickedFile();
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useAccountSave({ save: uploadAvatar, toast: t.account.toast.avatar, onDone, onSaved: () => setPicked(null) });
  const remove = useAccountSave({ save: removeAvatar, toast: t.account.toast.avatarRemoved, onDone });
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    if (!chosen) return;
    const code = avatarFileProblem(chosen);
    setProblem(code && accountMessage(code));
    upload.setErrors({});
    remove.setErrors({});
    setPicked(code ? null : chosen);
  };
  const failed = { ...remove.errors, ...upload.errors };
  const error = problem ?? failed.avatar ?? failed.form;
  const pending = upload.pending ? 'upload' : remove.pending ? 'remove' : null;
  return (
    <AccountSection title={A.title}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Avatar
          name={profile.full_name}
          src={picked?.url ?? profile.avatar_url}
          alt={picked ? A.preview : A.alt.replace('{name}', profile.full_name)}
          size="lg"
          className={picked ? 'outline-2 outline-offset-2 outline-rule-strong outline-dashed' : undefined}
        />
        <div className="grid min-w-0 flex-1 basis-60 gap-3">
          <AvatarActions
            pending={pending}
            previewing={picked !== null}
            hasPhoto={profile.avatar_url !== null}
            onPick={pick}
            onUpload={() => picked && upload.submit(picked.file)}
            onCancel={() => setPicked(null)}
            onRemove={() => remove.submit(undefined)}
          />
          <p className="text-xs text-pretty text-ink-3">{A.hint}</p>
          {error && <FormAlert>{error}</FormAlert>}
        </div>
      </div>
    </AccountSection>
  );
}
