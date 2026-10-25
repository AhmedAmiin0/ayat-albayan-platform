import type { LeadFollowUp } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '../ErrorLine';
import { deviceTimeZone } from '../message-text';
import { followUpLines } from './follow-up-text';
import { Heading } from './Heading';
import { saveErrorText, useFollowUpTotal, useLeadPatch, type LeadProfile } from './queries';

const f = t.followUps;

export interface FollowUpCardProps {
  lead: LeadProfile;
  /** The lead's read got no answer: the pause stays as it is until the network is back. */
  offline: boolean;
}

/**
 * «المتابعة» (R-LEAD-05, L2), like the web's FollowUpLine: what the automation does next, and the
 * per-lead pause. A lead who sent «وقف» opted out of marketing: resuming asks first.
 */
export function FollowUpCard({ lead, offline }: FollowUpCardProps) {
  const { color } = useTheme();
  const total = useFollowUpTotal();
  const pause = useLeadPatch<LeadFollowUp>('follow-up');
  const [confirming, setConfirming] = useState(false);
  const paused = lead.follow_up_paused === true;
  const byLead = paused && lead.follow_up_paused_by === 'lead';
  const set = (value: boolean) =>
    pause.mutate({ id: lead.id, body: { paused: value } }, { onSuccess: () => setConfirming(false) });

  const action = confirming ? (
    <InlineConfirm
      message={f.resumeLeadConfirm}
      confirmLabel={pause.isPending ? t.common.saving : f.resumeLeadYes}
      busy={pause.isPending}
      onConfirm={() => set(false)}
      onCancel={() => setConfirming(false)}
    />
  ) : (
    <View style={{ alignSelf: 'flex-start', marginStart: -20 }}>
      <Button
        variant="ghost"
        label={pause.isPending ? t.common.saving : paused ? f.resume : f.pause}
        busy={pause.isPending}
        onPress={() => (byLead ? setConfirming(true) : set(!paused))}
      />
    </View>
  );

  return (
    <View style={{ gap: 6 }}>
      <Heading>{f.title}</Heading>
      <View style={{ borderStartWidth: 3, borderStartColor: color.goldSoft, paddingStart: 12, gap: 2 }}>
        {followUpLines(lead, total, deviceTimeZone()).map((line) => (
          <AppText
            key={line}
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size.sm,
              lineHeight: type.lineHeight(type.size.sm),
              color: color.ink2,
            }}
          >
            {line}
          </AppText>
        ))}
      </View>
      {offline ? null : action}
      {pause.isError ? <ErrorLine message={saveErrorText(pause.error)} /> : null}
      {pause.isSuccess ? <Note>{t.inbox.followUpSaved}</Note> : null}
    </View>
  );
}
