import { useRouter } from '@tanstack/react-router';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Button } from '@ab/web-kit/components/ui/form/button';
import type { RouteNotFoundProps } from './RouteNotFound.types';

/** An address no route matches: said in the app's words, with the way home. */
export function RouteNotFound({ words, home }: RouteNotFoundProps) {
  const router = useRouter();
  const goHome = (
    <Button type="button" onClick={() => void router.navigate({ href: home })}>
      {words.home}
    </Button>
  );
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState title={words.title} action={goHome}>
        {words.body}
      </EmptyState>
    </div>
  );
}
