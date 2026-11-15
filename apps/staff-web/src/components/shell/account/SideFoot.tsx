import { ClockToggle } from '@/components/ui/layout/clock-toggle';
import { ThemeToggle } from '@/components/ui/layout/theme-toggle';
import { cn } from '@/lib/utils';
import { AccountChip } from './AccountChip';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';

/**
 * Sidebar foot (docs/07 §7, ≥ 900px): theme, clock format, language, logout, and the signed-in account as the
 * «حسابي» link (photo or initials + email, R-ACC-01). Below 900px
 * the same controls sit at the foot of the «القائمة» sheet (MenuFoot).
 */
export function SideFoot({ email }: { email?: string | null }) {
  return (
    <div
      data-side-foot
      className={cn(
        'ms-auto flex shrink-0 items-center gap-1',
        // ≥900px: pinned to the bottom of the sidebar's scroll area on the sidebar's own background
        // (it spans the full width, past the aside's 12px padding), content on the icon edge (24px).
        'shell:sticky shell:bottom-0 shell:z-10 shell:-ms-3 shell:-me-3 shell:mt-auto shell:grid shell:grid-cols-[minmax(0,1fr)_auto] shell:gap-x-2 shell:gap-y-2 shell:border-t shell:border-rule shell:bg-cover shell:px-6 shell:pt-4 shell:pb-6',
      )}
    >
      {/* Four short rows: theme; clock format; language + logout; «حسابي». The «القائمة» sheet has its own foot (MenuFoot). */}
      <ThemeToggle className="hidden shell:col-span-2 shell:inline-flex shell:justify-self-start" />
      <ClockToggle className="hidden shell:col-span-2 shell:inline-flex shell:justify-self-start" />
      <LanguageSwitch className="shell:justify-self-start" />
      <LogoutButton />
      <AccountChip email={email} className="hidden shell:col-span-2 shell:-mx-1.5 shell:flex" />
    </div>
  );
}
