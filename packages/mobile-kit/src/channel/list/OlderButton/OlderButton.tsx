import { t } from '../../../lib/i18n/i18n';
import { Button } from '../../../ui/primitives/Button';
import type { useChannel } from '../../channel-api';

/** Shown while older pages exist; nothing once all are in. */
export function OlderButton({ query }: { query: ReturnType<typeof useChannel> }) {
  if (!query.hasNextPage) return null;
  return (
    <Button
      variant="ghost"
      label={t.studentChannel.older}
      busy={query.isFetchingNextPage}
      onPress={() => void query.fetchNextPage()}
    />
  );
}
