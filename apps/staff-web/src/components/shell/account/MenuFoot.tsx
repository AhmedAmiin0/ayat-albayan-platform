import { LanguageSwitch } from '@ab/web-kit';
import { AccountChip } from './AccountChip';
import { LogoutButton } from './LogoutButton';

/** Same controls as the sidebar foot; the theme and time switches open the sheet instead. */
export function MenuFoot({ email }: { email?: string | null }) {
  return (
    <div className="mt-5 grid gap-3 border-t border-rule pt-4">
      <AccountChip email={email} className="-mx-1.5" />
      <div className="flex min-w-0 items-center gap-2">
        <LanguageSwitch className="min-h-11" />
        <LogoutButton className="ms-auto" />
      </div>
    </div>
  );
}
