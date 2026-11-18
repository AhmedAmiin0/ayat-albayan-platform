import { Link } from '@tanstack/react-router';
import { MeTestChip } from '@ab/web-kit/auth/MeTestChip';
import { FamilyBrand } from '@ab/web-kit/components/family/brand/FamilyBrand';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Bell } from './Bell';
import { ChildSwitch } from './ChildSwitch';
import { TabBar } from './TabBar';

/**
 * The deep-green header on every signed-in family page (boards PortalWebHome, PortalPhoneHome):
 * the academy's lockup back to /portal (the compact tile on phones), the pill nav from the
 * `shell:` width, then «تجريبي» on a test family (docs/56), the child switch and the bell.
 */
export function FamilyHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-fam-gold/20 bg-[image:var(--fam-header)]
      shadow-[0_6px_20px_rgba(12,42,30,0.18)]">
      <div className="mx-auto flex min-h-16 max-w-[1168px] items-center justify-between gap-2 px-4
        py-1 shell:h-20 shell:gap-4 shell:px-6 shell:py-0">
        <Link to="/portal" aria-label={t.familyLook.brand.name}
          className="flex min-h-11 min-w-0 items-center rounded-xl">
          <span className="flex min-w-0 shell:hidden"><FamilyBrand compact /></span>
          <span className="hidden min-w-0 shell:flex"><FamilyBrand /></span>
        </Link>
        <TabBar place="top" />
        <div className="flex shrink-0 items-center gap-2 shell:gap-3">
          <MeTestChip />
          <ChildSwitch />
          <Bell />
        </div>
      </div>
    </header>
  );
}
