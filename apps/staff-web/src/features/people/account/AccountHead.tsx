import type { AccountProfile } from '@ab/shared';
import { Avatar, Cartouche, Ltr, PageHead, t } from '@ab/web-kit';
import { avatarSeed } from './avatar-file';
import { roleLabel } from './role-label';

export function AccountHead({ profile }: { profile?: AccountProfile }) {
  return (
    <>
      <PageHead className="mb-2">
        <Cartouche>{t.account.title}</Cartouche>
      </PageHead>
      <p className="max-w-[70ch] text-body text-pretty text-ink-2">{t.account.subtitle}</p>
      {profile && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Avatar name={profile.full_name} id={avatarSeed(profile)} src={profile.avatar_url} size="md" decorative />
          <span className="text-lg font-semibold text-ink">{profile.full_name}</span>
          <span className="rounded-full border border-rule-strong bg-sunk px-2.5 py-0.5 text-xs font-semibold text-ink-2">
            {t.account.role.replace('{role}', roleLabel(profile.role))}
          </span>
          {profile.email && <Ltr className="text-sm text-ink-2">{profile.email}</Ltr>}
        </div>
      )}
    </>
  );
}
