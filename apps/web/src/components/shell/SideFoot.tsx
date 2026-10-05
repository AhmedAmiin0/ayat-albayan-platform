import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';

/**
 * Sidebar foot (docs/07 §7): theme, language, the signed-in account, logout. Below 900px the
 * language switch and the logout button stay (the compact top row), so both work on phones.
 * TODO(R-AUTH-01): show the profile's full name + role once /auth/me returns them.
 */
export function SideFoot({ email }: { email?: string | null }) {
  return (
    <div
      data-side-foot
      className={cn(
        'ms-auto flex shrink-0 items-center gap-1',
        // ≥900px: pinned to the bottom of the sidebar's scroll area on the sidebar's own background
        // (it spans the full width, past the aside's 12px padding), content on the icon edge (24px).
        'shell:sticky shell:bottom-0 shell:z-10 shell:-ms-3 shell:-me-3 shell:mt-auto shell:grid shell:gap-3 shell:border-t shell:border-rule shell:bg-cover shell:px-6 shell:pt-4 shell:pb-6',
      )}
    >
      <ThemeToggle className="hidden shell:inline-flex shell:justify-self-start" />
      <LanguageSwitch className="shell:justify-self-start" />
      <div className="flex min-w-0 items-center gap-2">
        {email && (
          <span dir="ltr" className="hidden min-w-0 flex-1 truncate rtl:text-end text-xs text-ink-2 shell:block">
            {email}
          </span>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}
