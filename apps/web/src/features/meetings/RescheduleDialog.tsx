import type { MeetingView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { MEETINGS_KEY } from './internal-api';
import { meetingErrorText, updateMeeting } from './meeting-invites-api';
import { scheduleIssue, scheduleOf, startsAtOf, type ScheduleValue } from './schedule-form';
import { ScheduleFields } from './ScheduleFields';

const L = t.meetingInvites;

interface Props {
  meeting: MeetingView & { starts_at: string };
  tz: string;
  onClose: () => void;
}

/** «غيّر الموعد» (creator or admin): date, time and duration on the viewer's clock → PATCH /meetings/:id. */
export function RescheduleDialog({ meeting, tz, onClose }: Props) {
  const [value, setValue] = useState<ScheduleValue>(() => scheduleOf(meeting, tz));
  const [issue, setIssue] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: updateMeeting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEETINGS_KEY });
      onClose();
    },
  });
  const submit = () => {
    const problem = scheduleIssue(value, { now: new Date(), tz });
    setIssue(problem && L.errors[problem]);
    if (!problem) save.mutate({ id: meeting.id, body: { startsAt: startsAtOf(value, tz), durationMin: value.durationMin } });
  };
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
      <Button type="button" disabled={save.isPending} onClick={submit}>
        {save.isPending ? L.saving : L.save}
      </Button>
    </>
  );
  return (
    <Dialog title={L.list.reschedule} description={meeting.title} onClose={onClose} actions={actions}>
      <div className="grid gap-4">
        <ScheduleFields value={value} onChange={setValue} tz={tz} />
        {issue && <FormAlert>{issue}</FormAlert>}
        {save.isError && <FormAlert>{meetingErrorText(save.error)}</FormAlert>}
      </div>
    </Dialog>
  );
}
