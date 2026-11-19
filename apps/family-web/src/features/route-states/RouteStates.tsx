import { Link, useRouter } from '@tanstack/react-router';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** A route still loading (its guard or its code): the kit skeleton, never a blank page. */
export function RoutePending() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <ListSkeleton rows={3} />
    </div>
  );
}

/**
 * A route that failed (a guard's read, a lost chunk): what happened in the family's language, a
 * retry (re-runs the route's loads) and the way home, instead of the router's English screen.
 */
export function RouteError() {
  const router = useRouter();
  const words = t.familyWeb.routeError;
  return (
    <div className="grid min-h-[50dvh] place-items-center px-4">
      <Card role="alert" className="grid w-full max-w-md gap-4 p-6 text-center">
        <h1 className="font-display text-h3 font-bold">{words.title}</h1>
        <p className="text-sm text-pretty text-ink-2">{words.body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => void router.invalidate()}>
            {words.retry}
          </Button>
          <Link to="/portal" className={buttonVariants({ variant: 'secondary' })}>
            {words.home}
          </Link>
        </div>
      </Card>
    </div>
  );
}
