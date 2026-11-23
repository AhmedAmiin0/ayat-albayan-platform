import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@ab/web-kit/form';
import { Card } from '@ab/web-kit/surface';
import { env } from '@ab/web-kit/http';
import { t } from '@ab/web-kit/i18n';

/**
 * A staff login on the family host (docs/51 §3): already signed out by the guard; the notice, the
 * staff app's link (when this build knows it) and the family sign-in.
 */
export function WrongApp() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card asChild className="grid w-full max-w-md gap-4 p-6 text-center">
        <section role="alert">
        <p className="text-body text-pretty text-ink">{t.familyApp.wrongApp}</p>
        {env.staffOrigin && (
          <a href={`${env.staffOrigin}/login`} className={buttonVariants({ size: 'lg' })}>
            {t.familyWeb.toStaffApp}
          </a>
        )}
        <Link to="/login" className={buttonVariants({ variant: 'ghost' })}>
          {t.familyWeb.familySignIn}
        </Link>
        </section>
      </Card>
    </main>
  );
}
