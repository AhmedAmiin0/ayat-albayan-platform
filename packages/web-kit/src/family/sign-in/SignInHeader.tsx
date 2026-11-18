import { FamilyBrand } from '@ab/web-kit/family/brand/FamilyBrand';

/**
 * The signed-out header (boards PortalWebSignIn / PortalPhoneSignIn): the deep-green bar with the
 * academy lockup only (no nav, no account), 80 px tall on the 1120 px column, 64 px on phones.
 */
export function SignInHeader() {
  return (
    <header className="relative z-10 shrink-0 border-b border-fam-gold/20
      bg-[image:var(--fam-header)] shadow-[0_6px_20px_rgba(12,42,30,0.18)]">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center px-4 sm:h-20">
        <FamilyBrand />
      </div>
    </header>
  );
}
