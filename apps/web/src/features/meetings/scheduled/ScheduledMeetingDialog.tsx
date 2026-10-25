import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { viewerTz } from '@/features/classroom/student-link/student-link';
import { t } from '@/lib/i18n/i18n';
import { CreatedMeeting } from '../internal/CreatedMeeting';
import { MEETINGS_KEY } from '../internal/internal-api';
import type { PickedInvitee } from '../invitees/invitee-list';
import { InviteePicker } from '../invitees/InviteePicker';
import { createMeetingWith, meetingErrorText } from '../invitees/meeting-invites-api';
import { createBody, defaultSchedule, scheduleIssue, type ScheduleValue } from './schedule-form';
import { ScheduleFields } from './ScheduleFields';

const L = t.meetingInvites;

interface Props {
  onClose: () => void;
  /** The viewer's zone; the browser's own by default. */
  tz?: string;
}

/**
 * «اجتماع مجدول» (R-MEET-01..03): a title, the date and time on the viewer's clock, the duration and
 * the invitees; then the link and one result per recipient («انسخ الرابط والدعوة» when the window is closed).
 */
export function ScheduledMeetingDialog({ onClose, tz = viewerTz() }: Props) {
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<ScheduleValue>(() => defaultSchedule(new Date(), tz));
  const [invitees, setInvitees] = useState<PickedInvitee[]>([]);
  const [requestId] = useState(() => crypto.randomUUID());
  const [issue, setIssue] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createMeetingWith,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEETINGS_KEY }),
  });
  const submit = () => {
    const problem = scheduleIssue(schedule, { now: new Date(), tz });
    setIssue(problem && L.errors[problem]);
    if (!problem) create.mutate(createBody({ title, invitees, clientRequestId: requestId, schedule: { value: schedule, tz } }));
  };
  const made = create.data;
  const actions = made ? (
    <Button type="button" onClick={onClose}>{t.common.close}</Button>
  ) : (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
      <Button type="button" disabled={create.isPending} onClick={submit}>
        {create.isPending ? L.creating : L.create}
      </Button>
    </>
  );
  return (
    <Dialog title={L.scheduleTitle} description={L.scheduleHint} onClose={onClose} actions={actions}>
      {made ? (
        <CreatedMeeting made={made} />
      ) : (
        <div className="grid gap-4">
          <Field label={L.title}>
            {(p) => <Input {...p} value={title} maxLength={60} placeholder={t.meetings.internal.titlePlaceholder} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <ScheduleFields value={schedule} onChange={setSchedule} tz={tz} />
          <InviteePicker picked={invitees} onPicked={setInvitees} />
          {issue && <FormAlert>{issue}</FormAlert>}
          {create.isError && <FormAlert>{meetingErrorText(create.error, t.meetings.internal.error)}</FormAlert>}
        </div>
      )}
    </Dialog>
  );
}
