import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '../ErrorLine';
import type { Lead } from '../shared/types';
import { FollowUpCard } from './FollowUpCard';
import { QualificationForm } from './QualificationForm';
import { readIsOffline, useFreshLead, type LeadProfile } from './queries';

/**
 * The lead's follow-up and qualification on the lead screen (R-LEAD-03/05, mobile parity with the
 * web's lead panel). It shows the cached row at once and the fresh one when it arrives. Offline it
 * says so once, keeps both readable and offers no save or pause until a retry gets an answer.
 */
export function LeadProfileSection({ lead }: { lead: Lead }) {
  const fresh = useFreshLead(lead.phone_e164);
  const row: LeadProfile = fresh.data ?? lead;
  const offline = readIsOffline(fresh);

  return (
    <View style={{ gap: 20 }}>
      {offline ? (
        <View style={{ gap: 4 }}>
          <ErrorLine message={t.leads.mobile.offline} />
          <Button
            variant="secondary"
            label={t.mobile.retry}
            busy={fresh.isFetching}
            onPress={() => void fresh.refetch()}
          />
        </View>
      ) : null}
      <FollowUpCard lead={row} offline={offline} />
      {/* ponytail: remounts once, when the fresh row replaces the cached one (edits typed before
          it arrived are dropped; offline there is no save anyway). Later refetches keep the form. */}
      <QualificationForm key={fresh.data === undefined ? 'cached' : 'fresh'} lead={row} offline={offline} />
    </View>
  );
}
