import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { FilterPills } from '@/core/ui/form/FilterPills';
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

/**
 * «المدعوون»: the team (an in-app notification), students (their guardian, on WhatsApp when the creator
 * may send it, else a link to share) or a typed phone (admin and sales only), as removable chips; at
 * most 30. Used by both the instant and the scheduled create.
 */
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
