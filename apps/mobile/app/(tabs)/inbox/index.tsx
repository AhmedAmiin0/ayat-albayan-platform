import { t } from '@/lib/i18n';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

// TODO(R-MOB-02): placeholder until the inbox builder renders GET /leads here.
export default function Inbox() {
  return (
    <Screen>
      <ScreenHeader title={t.nav.leads} />
      <EmptyState title={t.common.empty} />
    </Screen>
  );
}
