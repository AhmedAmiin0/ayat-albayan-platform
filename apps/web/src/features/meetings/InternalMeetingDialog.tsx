import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { createMeeting, MEETINGS_KEY } from './internal-api';
import { MeetingLinkBox } from './MeetingLinkBox';

interface Props {
  onClose: () => void;
  /** «ادخل الاجتماع»: defaults to a full page load of /meeting/<id>, like «ادخل الحلقة». */
  onEnter?: (meetingId: string) => void;
}

const L = t.meetings.internal;
const goTo = (id: string) => window.location.assign(`/meeting/${id}`);

/**
 * «اجتماع داخلي» (POST /meetings): an optional title, then the link with «انسخ الرابط» and
 * «ادخل الاجتماع». No students, no teacher, no WhatsApp: the room is just a link to share.
 */
export function InternalMeetingDialog({ onClose, onEnter = goTo }: Props) {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createMeeting,
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
      <Button type="button" disabled={create.isPending} onClick={() => create.mutate(title)}>
        {create.isPending ? L.creating : L.create}
      </Button>
    </>
  );
  return (
    <Dialog title={L.dialogTitle} description={L.dialogHint} onClose={onClose} actions={actions}>
      {made ? (
        <MeetingLinkBox url={made.url} note={L.ready} />
      ) : (
        <div className="grid gap-4">
          <Field label={L.title}>
            {(p) => <Input {...p} value={title} maxLength={60} placeholder={L.titlePlaceholder} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          {create.isError && <FormAlert>{L.error}</FormAlert>}
        </div>
      )}
    </Dialog>
  );
}
