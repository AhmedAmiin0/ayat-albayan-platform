import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';

/**
 * Sidebar foot (docs/07 §7, ≥ 900px): theme, language, the signed-in account, logout. Below 900px
 * the same controls sit at the foot of the «القائمة» sheet (MenuFoot).
 * TODO(R-AUTH-01): show the profile's full name + role once /auth/me returns them.
 */
export function SideFoot({ email }: { email?: string | null }) {
  return (
    <div className="mt-auto grid shrink-0 gap-3 border-t border-rule px-1.5 pt-3">
      <ThemeToggle className="justify-self-start" />
      <LanguageSwitch className="justify-self-start" />
      <div className="flex min-w-0 items-center gap-2">
        {email && (
          <span dir="ltr" className="min-w-0 flex-1 truncate text-xs text-ink-2 rtl:text-end">
            {email}
          </span>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}
