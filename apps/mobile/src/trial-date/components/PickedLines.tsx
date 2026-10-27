import { View } from 'react-native';
import { SummaryList } from '@/booking/trial/components/ConfirmStep';
import { t } from '@/core/lib/i18n/i18n';
import { SectionLabel } from '@/students/list/SectionLabel';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import type { TrialDateDraft } from '../lib/trial-date-body';
import { whenLines } from '../lib/trial-date-text';
import { useClockCycle } from '@/core/lib/clock';

/** The review's picks: the new time (the viewer's clock, the family's under it when it differs), the teacher. */
export function PickedLines({ draft }: { draft: TrialDateDraft }) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const at = draft.startsAt ? whenLines(draft.startsAt, draft.tz, cycle) : null;
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <>
      {at ? (
        <View style={{ gap: 2 }}>
          <SectionLabel>{t.trialDate.mobile.newTime}</SectionLabel>
          <AppText style={{ ...note, fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}>
            {at.when}
          </AppText>
          {at.family ? <AppText style={note}>{at.family}</AppText> : null}
        </View>
      ) : null}
      {draft.teacher ? <SummaryList rows={[[t.booking.steps.teacher, draft.teacher.name]]} /> : null}
    </>
  );
}
