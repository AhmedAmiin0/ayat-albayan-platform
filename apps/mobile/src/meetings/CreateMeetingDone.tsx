import type { MeetingCreateResult } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { InviteResults } from './InviteResults';
import { MeetingLinkShare } from './MeetingLinkShare';
import { useEnterMeeting } from './use-enter-meeting';

const L = t.meetings.internal;

/** After a create: the meeting's link to share, each invitee's outcome, «ادخل الاجتماع» (instant only). */
export function CreateMeetingDone({ made, instant, onClose }: { made: MeetingCreateResult; instant: boolean; onClose: () => void }) {
  const enter = useEnterMeeting();
  return (
    <View style={{ gap: 12 }}>
      <MeetingLinkShare url={made.url} note={L.ready} />
      <InviteResults results={made.invitees} />
      {instant ? <Button label={L.enter} busy={enter.pending} onPress={() => enter.run(made.id)} /> : null}
      {enter.error ? <ErrorLine message={enter.error} /> : null}
      <Button variant="ghost" label={t.common.close} onPress={onClose} />
    </View>
  );
}
