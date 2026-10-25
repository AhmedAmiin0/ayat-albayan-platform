import type { MeetingView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { rescheduleBody } from './create-body';
import { updateMeeting } from './invite-api';
import { inviteError } from './invite-text';
import { ScheduleFields } from './ScheduleFields';
import { slotOf, type Slot } from './schedule-time';

const I = t.meetingInvites;

export interface RescheduleMeetingProps {
  meeting: MeetingView & { starts_at: string };
  tz: string;
  onDone: () => void;
}

/** «غيّر الموعد»: the same chips and steppers, prefilled with the meeting's time; PATCH, then the list refreshes. */
export function RescheduleMeeting({ meeting, tz, onDone }: RescheduleMeetingProps) {
  const [slot, setSlot] = useState<Slot>(() => slotOf(meeting.starts_at, meeting.planned_end_at, tz));
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: updateMeeting,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['meetings'] });
      onDone();
    },
  });
  return (
    <View style={{ gap: 10 }}>
      <ScheduleFields slot={slot} onChange={setSlot} tz={tz} />
      <Button
        label={save.isPending ? I.saving : I.save}
        busy={save.isPending}
        onPress={() => save.mutate({ id: meeting.id, body: rescheduleBody(slot, tz) })}
      />
      <Button variant="ghost" label={t.common.cancel} onPress={onDone} />
      {save.isError ? <ErrorLine message={inviteError(save.error)} /> : null}
    </View>
  );
}
