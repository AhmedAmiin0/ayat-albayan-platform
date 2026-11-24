import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { avatarSeed } from '@/features/people/account';
import { profileQuery } from '@/features/people/account/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

export interface AccountChipProps {
  email?: string | null;
  variant?: 'block' | 'inline';
  className?: string;
}

/** The profile is its own query; while loading or failed, initials come from the email. */
export function AccountChip({ email, variant = 'block', className }: AccountChipProps) {
  const { data: profile } = useQuery(profileQuery);
  const name = profile?.full_name ?? email ?? '';
  const inline = variant === 'inline';
  return (
    <Link
      to="/account"
      className={cn(
        'group flex min-h-11 min-w-0 items-center gap-2.5 rounded-md text-ink-2 no-underline transition-colors duration-[120ms] hover:bg-sunk hover:text-ink',
        'aria-[current=page]:bg-page aria-[current=page]:text-ink aria-[current=page]:shadow-[0_0_0_1px_var(--rule-strong)]',
        inline ? 'shrink-0 ps-1 pe-2.5' : 'px-1.5 py-1',
        className,
      )}
    >
      <Avatar name={name} id={avatarSeed(profile)} src={profile?.avatar_url} size="sm" decorative />
      <span className="grid min-w-0 leading-tight">
        <span className="text-xs font-semibold text-ink group-aria-[current=page]:text-lapis">{t.account.nav}</span>
        {!inline && email && (
          <span dir="ltr" className="truncate text-xs text-ink-2 rtl:text-end">
            {email}
          </span>
        )}
      </span>
    </Link>
  );
}
