import { useRouter } from '@tanstack/react-router';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import type { RouteErrorProps } from './RouteError.types';

/**
 * A route that failed (a guard's read, a lost chunk, a render error): what happened in the app's
 * own words, a retry that re-runs the route's loads, and the way home. The raw message is never
 * shown; it goes to the error tracker.
 */
export function RouteError({ words, home }: RouteErrorProps) {
  const router = useRouter();
  return (
    <div className="grid place-items-center px-4 py-16">
      <Card role="alert" className="grid w-full max-w-md gap-4 p-6 text-center">
        <h1 className="font-display text-h3 font-bold">{words.title}</h1>
        <p className="text-sm text-pretty text-ink-2">{words.body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => void router.invalidate()}>
            {words.retry}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void router.navigate({ href: home })}>
            {words.home}
          </Button>
        </div>
      </Card>
    </div>
  );
}
