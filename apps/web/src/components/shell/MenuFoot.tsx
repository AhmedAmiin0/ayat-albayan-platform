import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';

/**
 * The foot of the «القائمة» sheet (< 900px): the same controls as the sidebar foot (theme,
 * language, the signed-in account, logout), so the top bar keeps one button only.
 */
export function MenuFoot({ email }: { email?: string | null }) {
  return (
    <div className="mt-5 grid gap-3 border-t border-rule pt-4">
      <ThemeToggle className="justify-self-start" />
      <div className="flex min-w-0 items-center gap-2">
        <LanguageSwitch className="min-h-11" />
        {email && (
          <span dir="ltr" className="min-w-0 flex-1 truncate text-xs text-ink-2 rtl:text-end">
            {email}
          </span>
        )}
        <LogoutButton className="ms-auto" />
      </div>
    </div>
  );
}
