import { t } from '@/lib/i18n';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

// TODO(R-MOB-02): placeholder until the students builder renders GET /students here.
export default function Students() {
  return (
    <Screen>
      <ScreenHeader title={t.nav.students} />
      <EmptyState title={t.common.empty} />
    </Screen>
  );
}
