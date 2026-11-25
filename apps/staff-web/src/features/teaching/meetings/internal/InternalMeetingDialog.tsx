import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Dialog, Field, FormAlert, Input, t } from '@ab/web-kit';
import { CreatedMeeting } from './CreatedMeeting';
import { MEETINGS_KEY } from './internal-api';
import type { PickedInvitee } from '@/features/teaching/meetings/invitees/invitee-list';
import { InviteePicker } from '@/features/teaching/meetings/invitees/InviteePicker';
import { createMeetingWith, meetingErrorText } from '@/features/teaching/meetings/invitees/meeting-invites-api';
import { createBody } from '@/features/teaching/meetings/scheduled/schedule-form';

interface Props {
  onClose: () => void;
  /** Defaults to a full page load of /meeting/<id>, like joining a lesson. */
  onEnter?: (meetingId: string) => void;
}

const L = t.meetings.internal;
const goTo = (id: string) => window.location.assign(`/meeting/${id}`);

/** No time means open now; no lesson, no teacher. */
export function InternalMeetingDialog({ onClose, onEnter = goTo }: Props) {
  const [title, setTitle] = useState('');
  const [invitees, setInvitees] = useState<PickedInvitee[]>([]);
  const [requestId] = useState(() => crypto.randomUUID());
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createMeetingWith,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEETINGS_KEY }),
  });
  const made = create.data;
  const actions = made ? (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{t.common.close}</Button>
      <Button type="button" onClick={() => onEnter(made.id)}>{L.enter}</Button>
    </>
  ) : (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
      <Button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate(createBody({ title, invitees, clientRequestId: requestId }))}
      >
        {create.isPending ? L.creating : L.create}
      </Button>
    </>
  );
  return (
    <Dialog title={L.dialogTitle} description={t.meetingInvites.instantHint} onClose={onClose} actions={actions}>
      {made ? (
        <CreatedMeeting made={made} />
      ) : (
        <div className="grid gap-4">
          <Field label={L.title}>
            {(p) => <Input {...p} value={title} maxLength={60} placeholder={L.titlePlaceholder} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <InviteePicker picked={invitees} onPicked={setInvitees} />
          {create.isError && <FormAlert>{meetingErrorText(create.error, t.meetings.internal.error)}</FormAlert>}
        </div>
      )}
    </Dialog>
  );
}
