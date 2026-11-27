import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import type { RouteNotFoundProps } from './RouteNotFound.types';
import { useRouteNotFound } from './use-route-not-found';

/** An address no route matches: said in the app's words, with the way home. */
export function RouteNotFound({ words, home }: RouteNotFoundProps) {
  const { goHome } = useRouteNotFound({ home });
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        title={words.title}
        action={
          <Button type="button" onClick={goHome}>
            {words.home}
          </Button>
        }
      >
        {words.body}
      </EmptyState>
    </div>
  );
}
