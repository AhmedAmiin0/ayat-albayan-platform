import type { MeetingCreateResult } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { InviteResults } from '../invite/InviteResults';
import { MeetingLinkShare } from '../manage/MeetingLinkShare';
import { useEnterMeeting } from '../manage/use-enter-meeting';

const L = t.meetings.internal;

/** After a create: the meeting's link to share, each invitee's outcome, then ONE ButtonRow «ادخل الاجتماع» (instant only) | «إغلاق». */
export function CreateMeetingDone({ made, instant, onClose }: { made: MeetingCreateResult; instant: boolean; onClose: () => void }) {
  const enter = useEnterMeeting();
  return (
    <View style={{ gap: 12 }}>
      <MeetingLinkShare url={made.url} note={L.ready} />
      <InviteResults results={made.invitees} />
      <ButtonRow>
        {instant ? <Button label={L.enter} busy={enter.pending} onPress={() => enter.run(made.id)} /> : null}
        <Button variant="secondary" label={t.common.close} onPress={onClose} />
      </ButtonRow>
      {enter.error ? <ErrorLine message={enter.error} /> : null}
    </View>
  );
}
