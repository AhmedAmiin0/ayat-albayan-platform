import type { AccountProfile } from '@ab/shared';
import { Avatar } from '@/components/ui/display/avatar';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Ltr } from '@/components/ui/display/ltr';
import { PageHead } from '@/components/ui/layout/page';
import { t } from '@/lib/i18n/i18n';
import { roleLabel } from './role-label';

/** The one cartouche «حسابي», the subtitle, and who is signed in: photo, name, role, email (R-ACC-01). */
export function AccountHead({ profile }: { profile?: AccountProfile }) {
  return (
    <>
      <PageHead className="mb-2">
        <Cartouche>{t.account.title}</Cartouche>
      </PageHead>
      <p className="max-w-[70ch] text-body text-pretty text-ink-2">{t.account.subtitle}</p>
      {profile && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Avatar name={profile.full_name} id={profile.id} src={profile.avatar_url} size="md" decorative />
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
