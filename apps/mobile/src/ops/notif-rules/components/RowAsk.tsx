import type { NotificationEntryView, NotificationsOverview } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { reachLine } from '../lib/rule-words';
import type { CatalogueToggles } from '../hooks/use-catalogue-toggles';

interface RowAskProps {
  entry: NotificationEntryView;
  name: string;
  reach: NotificationsOverview['reach'];
  toggles: CatalogueToggles;
}

/** Under a row: the family ON question with whom it reaches, and a failed save in words. */
export function RowAsk({ entry, name, reach, toggles }: RowAskProps) {
  const r = t.mobileNotificationRules;
  const asking = toggles.ask?.key === entry.key ? toggles.ask.kind : null;
  // The typed sheet shows its own error.
  const error = asking === 'typed' ? undefined : toggles.errors[entry.key];
  if (asking !== 'family' && !error) return null;
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
      {asking === 'family' ? (
        <InlineConfirm
          message={r.familyConfirm.replace('{name}', name).replace('{reach}', reachLine(entry.audience, reach))}
          confirmLabel={r.turnOn}
          cancelLabel={r.cancel}
          busy={toggles.pendingKey === entry.key}
          onConfirm={() => toggles.send(entry, true)}
          onCancel={toggles.cancel}
        />
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
