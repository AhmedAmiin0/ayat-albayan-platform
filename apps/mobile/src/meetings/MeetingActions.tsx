import type { MeetingView } from '@ab/shared';
import { router, useSegments } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { manageOf, meetingsBase } from './meeting-text';
import { MeetingLinkShare } from './MeetingLinkShare';
import { MeetingManageButtons } from './MeetingManageButtons';
import { RescheduleMeeting } from './RescheduleMeeting';
import { useEnterMeeting } from './use-enter-meeting';
import { useMeetingManage } from './use-meeting-manage';

/**
 * Enter (only when can_join), then for its creator or an admin on an open meeting: reschedule and
 * cancel (scheduled), a new link and end, each asking first; recordings (creator or admin).
 */
export function MeetingActions({ meeting, tz }: { meeting: MeetingView; tz: string }) {
  const [moving, setMoving] = useState(false);
  const m = useMeetingManage(meeting.id);
  const enter = useEnterMeeting(tz);
  const base = meetingsBase(useSegments()[0]);
  const { manage, startsAt } = manageOf(meeting);
  if (moving && startsAt) return <RescheduleMeeting meeting={{ ...meeting, starts_at: startsAt }} tz={tz} onDone={() => setMoving(false)} />;
  const c = m.confirm;
  return (
    <View style={{ gap: 8 }}>
      {meeting.can_join ? <Button label={t.meetings.internal.enter} busy={enter.pending} onPress={() => enter.run(meeting.id)} /> : null}
      {c ? (
        <InlineConfirm message={c.message} confirmLabel={c.label} busy={c.busy} onConfirm={c.run} onCancel={() => !c.busy && m.close()} />
      ) : manage ? (
        <MeetingManageButtons scheduled={startsAt !== null} onAsk={m.ask} onMove={() => setMoving(true)} />
      ) : null}
      {m.newUrl ? <MeetingLinkShare url={m.newUrl} note={t.mobileClassroom.newLinkReady} /> : null}
      {meeting.can_manage ? (
        <Button variant="ghost" label={t.classroom.recordings.title} onPress={() => router.push(`${base}/meetings/${meeting.id}`)} />
      ) : null}
      {[enter.error, m.error].filter((e) => e !== null).map((e) => (
        <ErrorLine key={e} message={e} />
      ))}
    </View>
  );
}
