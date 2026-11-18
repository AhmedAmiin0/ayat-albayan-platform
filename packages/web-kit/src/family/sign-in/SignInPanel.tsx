import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { StarPattern } from '@ab/web-kit/family/ornament/StarPattern';
import { VerseArch } from '@ab/web-kit/family/ornament/VerseArch';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const L = t.familyLook;

/** The soft gold glows in two corners of the panel. */
const GLOW = 'pointer-events-none absolute rounded-full ' +
  'bg-[radial-gradient(circle,rgba(233,196,90,0.18),transparent_65%)]';

/**
 * The emerald half of the sign-in (boards PortalWebSignIn*): the star lattice, gold glows, the
 * welcome pill, «آيات البيان..» over the gold tagline, «تابِع الحلقات…», a ◆ and the tall verse
 * arch. On phones (PortalPhoneSignIn*) only the band: the ◆, the low arch, then the line.
 */
export function SignInPanel() {
  return (
    <aside aria-label={L.brand.name} className="relative flex flex-col items-center gap-3.5
      overflow-hidden bg-[image:var(--fam-hero)] px-4 pt-5 pb-13 text-center text-fam-hero-ink
      lg:order-last lg:justify-center lg:gap-[22px] lg:border-s lg:border-fam-gold/35 lg:px-12
      lg:py-14">
      <StarPattern />
      <span aria-hidden="true" className={`${GLOW} -end-28 -top-36 size-80 lg:-end-40 lg:-top-50
        lg:size-[520px]`} />
      <span aria-hidden="true" className={`${GLOW} -start-30 -bottom-40 hidden size-[360px] lg:block`} />
      <span className="relative hidden min-h-9 items-center gap-2 rounded-full border
        border-fam-gold/45 bg-white/7 px-4 text-sm font-bold lg:inline-flex">
        <Icon name="star" className="size-4 text-fam-gold" />
        {L.signIn.welcome}
      </span>
      <p className="relative hidden flex-col text-[42px] leading-[1.35] font-extrabold lg:flex">
        <span>{L.signIn.title}</span>
        <span className="text-fam-gold">{L.brand.tagline}</span>
      </p>
      <p className="relative text-[15px] leading-[1.7] text-fam-hero-ink-2 max-lg:order-last
        lg:mb-2 lg:text-[17px]">
        {t.familyApp.signIn.welcome}
      </p>
      <div aria-hidden="true" className="relative flex flex-col items-center">
        <span className="mb-2.5 size-3 rotate-45 bg-[image:var(--fam-gold-fill)]" />
        <VerseArch className="lg:hidden" />
        <VerseArch tall className="hidden lg:block" />
      </div>
    </aside>
  );
}
