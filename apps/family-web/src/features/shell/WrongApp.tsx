import { Link } from '@tanstack/react-router';
import { FamilyBrand } from '@ab/web-kit/components/family/brand/FamilyBrand';
import { pill } from '@ab/web-kit/components/family/brand/pill';
import { env } from '@ab/web-kit/lib/http/env';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/**
 * A staff login on the family host (docs/51 §3): already signed out by the guard; the notice, the
 * staff app's link (when this build knows it) and the family sign-in. The family look: a white
 * card on the cream page, the academy's lockup on its deep-green band on top.
 */
export function WrongApp() {
  return (
    <main className="grid min-h-dvh place-items-center bg-margin px-4 py-10">
      <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-rule bg-raised
        shadow-fam-lift">
        <div className="flex justify-center border-b border-fam-gold/20
          bg-[image:var(--fam-header)] px-6 py-5">
          <FamilyBrand />
        </div>
        <section role="alert" className="grid gap-4 p-6 text-center">
          <p className="text-body font-semibold text-pretty text-ink">{t.familyApp.wrongApp}</p>
          {env.staffOrigin && (
            <a href={`${env.staffOrigin}/login`} className={pill({ tone: 'green', size: 'lg' })}>
              {t.familyWeb.toStaffApp}
            </a>
          )}
          <Link to="/login" className={pill({ tone: 'outline', size: 'lg' })}>
            {t.familyWeb.familySignIn}
          </Link>
        </section>
      </div>
    </main>
  );
}
