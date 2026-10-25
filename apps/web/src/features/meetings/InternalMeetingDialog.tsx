import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n';
import { CreatedMeeting } from './CreatedMeeting';
import { MEETINGS_KEY } from './internal-api';
import type { PickedInvitee } from './invitee-list';
import { InviteePicker } from './InviteePicker';
import { createMeetingWith, meetingErrorText } from './meeting-invites-api';
import { createBody } from './schedule-form';

interface Props {
  onClose: () => void;
  /** «ادخل الاجتماع»: defaults to a full page load of /meeting/<id>, like «ادخل الحلقة». */
  onEnter?: (meetingId: string) => void;
}

const L = t.meetings.internal;
const goTo = (id: string) => window.location.assign(`/meeting/${id}`);

/**
 * «اجتماع داخلي» (POST /meetings, no time: open now): an optional title and optional invitees, then
 * the link with «انسخ الرابط», one result per invitee and «ادخل الاجتماع». No lesson, no teacher.
 */
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
