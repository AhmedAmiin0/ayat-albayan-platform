import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { MoreButtonProps } from './MoreButton.types';

/** The next page of past lessons; gone once the last page is in. */
export function MoreButton({ query }: MoreButtonProps) {
  if (!query.hasNextPage) return null;
  return (
    <Button
      type="button"
      variant="secondary"
      className="justify-self-center"
      disabled={query.isFetchingNextPage}
      onClick={() => void query.fetchNextPage()}
    >
      {query.isFetchingNextPage ? t.portal.loadingMore : t.portal.more}
    </Button>
  );
}
