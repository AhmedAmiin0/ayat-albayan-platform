import type { MeetingView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useSegments } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { endMeeting, newMeetingLink } from './api';
import { meetingError, meetingsBase } from './meeting-text';
import { MeetingLinkShare } from './MeetingLinkShare';
import { useEnterMeeting } from './use-enter-meeting';

type Asking = 'end' | 'link' | null;
const L = t.meetings.internal;

/**
 * Enter (open meetings), share link and end (open + creator or admin), recordings (creator or admin).
 * A new link and ending both ask first: the old link stops working / everyone is disconnected.
 */
export function MeetingActions({ meeting }: { meeting: MeetingView }) {
  const [asking, setAsking] = useState<Asking>(null);
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['meetings'] });
  const end = useMutation({ mutationFn: endMeeting, onSuccess: refresh, onSettled: () => setAsking(null) });
  const link = useMutation({ mutationFn: newMeetingLink, onSettled: () => setAsking(null) });
  const enter = useEnterMeeting();
  const base = meetingsBase(useSegments()[0]);
  const manage = meeting.state === 'open' && meeting.can_manage;
  const failure = [end.error, link.error].find((e) => e);
  const confirm = asking === 'end'
    ? { message: t.mobileClassroom.endConfirm, label: t.mobileClassroom.endAction, run: () => end.mutate(meeting.id), busy: end.isPending }
    : { message: t.mobileClassroom.newLinkConfirm, label: t.mobileClassroom.newLinkAction, run: () => link.mutate(meeting.id), busy: link.isPending };
  return (
    <View style={{ gap: 8 }}>
      {meeting.state === 'open' ? <Button label={L.enter} busy={enter.pending} onPress={() => enter.run(meeting.id)} /> : null}
      {asking ? (
        <InlineConfirm message={confirm.message} confirmLabel={confirm.label} busy={confirm.busy} onConfirm={confirm.run} onCancel={() => !confirm.busy && setAsking(null)} />
      ) : (
        <>
          {manage ? <Button variant="secondary" label={L.newLink} onPress={() => { end.reset(); setAsking('link'); }} /> : null}
          {manage ? <Button variant="ghost" label={L.end} onPress={() => { link.reset(); setAsking('end'); }} /> : null}
        </>
      )}
      {link.data ? <MeetingLinkShare url={link.data.url} note={t.mobileClassroom.newLinkReady} /> : null}
      {meeting.can_manage ? (
        <Button variant="ghost" label={t.classroom.recordings.title} onPress={() => router.push(`${base}/meetings/${meeting.id}`)} />
      ) : null}
      {enter.error ? <ErrorLine message={enter.error} /> : null}
      {failure ? <ErrorLine message={meetingError(failure)} /> : null}
    </View>
  );
}
