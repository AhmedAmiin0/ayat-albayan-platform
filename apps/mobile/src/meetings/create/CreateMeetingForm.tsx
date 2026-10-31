import type { CreateMeeting } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { requestId } from '@/core/lib/http/request-id';
import { Note } from '@/core/ui/feedback/Note';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { createBody } from './create-body';
import { InviteePicker } from '@/meetings/invite/InviteePicker';
import type { DraftInvitee } from '@/meetings/invite/invitee-draft';
import { ScheduleFields } from './ScheduleFields';
import { defaultSlot, type Slot } from './schedule-time';

const L = t.meetings.internal;
const I = t.meetingInvites;

interface CreateMeetingFormProps {
  scheduled: boolean;
  tz: string;
  busy: boolean;
  /** The refused create in words, or null. */
  error: string | null;
  onSubmit: (body: CreateMeeting) => void;
  onCancel: () => void;
}

/** The create form: a title, the time (scheduled only), and invitees (optional on an instant one). */
export function CreateMeetingForm({ scheduled, tz, busy, error, onSubmit, onCancel }: CreateMeetingFormProps) {
  const [title, setTitle] = useState('');
  const [slot, setSlot] = useState<Slot>(() => defaultSlot(new Date(), tz));
  const [invitees, setInvitees] = useState<DraftInvitee[]>([]);
  const [picking, setPicking] = useState(scheduled);
  const [key] = useState(requestId);
  const submit = () => onSubmit(createBody({ title, slot: scheduled ? slot : null, invitees, requestId: key }, tz));
  return (
    <View style={{ gap: 12 }}>
      {scheduled ? <Note>{I.scheduleHint}</Note> : null}
      <Field label={L.title} value={title} maxLength={60} placeholder={L.titlePlaceholder} onChangeText={setTitle} />
      {scheduled ? <ScheduleFields slot={slot} onChange={setSlot} tz={tz} /> : null}
      {picking ? (
        <InviteePicker value={invitees} onChange={setInvitees} />
      ) : (
        <Button variant="secondary" label={I.addInvitees} onPress={() => setPicking(true)} />
      )}
      <ButtonRow>
        <Button label={busy ? L.creating : L.create} busy={busy} onPress={submit} />
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
      </ButtonRow>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
