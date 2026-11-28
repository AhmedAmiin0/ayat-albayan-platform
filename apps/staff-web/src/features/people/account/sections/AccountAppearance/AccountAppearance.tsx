import { ThemeToggle, t } from '@ab/web-kit';
import { AccountSection } from '@/features/people/account/sections/AccountSection';

/** Browser settings, so they show even when the profile cannot load. */
export function AccountAppearance() {
  return (
    <AccountSection title={t.settings.sections.appearance}>
      <div className="grid justify-items-start gap-3">
        <ThemeToggle />
      </div>
    </AccountSection>
  );
}
