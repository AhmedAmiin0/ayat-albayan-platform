import { useState } from 'react';
import { View } from 'react-native';
import { t, FilterPills } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { InviteeChips } from './InviteeChips';
import { InviteeSearch } from './InviteeSearch';
import { addInvitee, isFull, removeInvitee, type DraftInvitee } from './invitee-draft';
import { PhoneInvitee } from './PhoneInvitee';
import { useMayInvitePhones } from './use-may-invite-phones';

const L = t.meetingInvites;
type Segment = 'staff' | 'student' | 'phone';
const segments = [
  { value: 'staff', label: L.tabs.staff },
  { value: 'student', label: L.tabs.students },
  { value: 'phone', label: L.tabs.phone },
] as const;

/** At most 30 invitees; typed phones are for admin and sales only. */
export function InviteePicker({ value, onChange }: { value: DraftInvitee[]; onChange: (list: DraftInvitee[]) => void }) {
  const [segment, setSegment] = useState<Segment>('staff');
  const phones = useMayInvitePhones();
  const items = phones ? segments : segments.filter((x) => x.value !== 'phone');
  const shown: Segment = phones || segment !== 'phone' ? segment : 'staff';
  const full = isFull(value);
  const add = (d: DraftInvitee) => onChange(addInvitee(value, d));
  return (
    <View style={{ gap: 10 }}>
      <FilterPills items={items} value={shown} onChange={setSegment} accessibilityLabel={L.invitees} />
      {shown === 'phone' ? (
        <PhoneInvitee onAdd={add} disabled={full} />
      ) : (
        <InviteeSearch key={shown} kind={shown} onAdd={add} disabled={full} />
      )}
      <InviteeChips list={value} onRemove={(key) => onChange(removeInvitee(value, key))} />
      {full ? <Note>{L.maxInvitees}</Note> : null}
    </View>
  );
}
