import { ThemeToggle } from '@/components/ui/layout/theme-toggle';
import { AccountChip } from './AccountChip';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';

/**
 * The foot of the «القائمة» sheet (< 900px): the same controls as the sidebar foot (the
 * «حسابي» link with the photo and email, theme, language, logout), so the top bar keeps one button only.
 */
export function MenuFoot({ email }: { email?: string | null }) {
  return (
    <div className="mt-5 grid gap-3 border-t border-rule pt-4">
      <AccountChip email={email} className="-mx-1.5" />
      <ThemeToggle className="justify-self-start" />
      <div className="flex min-w-0 items-center gap-2">
        <LanguageSwitch className="min-h-11" />
        <LogoutButton className="ms-auto" />
      </div>
    </div>
  );
}
