import type { MeetingCreateResult } from '@ab/schedule';
import { View } from 'react-native';
import { useViewerTz } from '@/core/lib/clock';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { InviteResults } from '@/meetings/invite/InviteResults';
import { MeetingLinkShare } from '@/meetings/manage/MeetingLinkShare';
import { useEnterMeeting } from '@/meetings/manage/use-enter-meeting';

const L = t.meetings.internal;

export function CreateMeetingDone({
  made,
  instant,
  onClose,
}: {
  made: MeetingCreateResult;
  instant: boolean;
  onClose: () => void;
}) {
  const enter = useEnterMeeting(useViewerTz());
  return (
    <View style={{ gap: 12 }}>
      <MeetingLinkShare url={made.url} note={L.ready} />
      <InviteResults results={made.invitees} />
      <ButtonRow>
        {instant ? (
          <Button label={L.enter} busy={enter.pending} onPress={() => enter.run(made.id)} />
        ) : null}
        <Button variant="secondary" label={t.common.close} onPress={onClose} />
      </ButtonRow>
      {enter.error ? <ErrorLine message={enter.error} /> : null}
    </View>
  );
}
