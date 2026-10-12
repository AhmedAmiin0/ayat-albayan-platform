import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { t } from '@/lib/i18n';
import { InviteeChips } from './InviteeChips';
import { addInvitee, isFull, removeInvitee, type PickedInvitee } from './invitee-list';
import { InviteeSearch } from './InviteeSearch';
import { PhoneInviteeInput } from './PhoneInviteeInput';

const L = t.meetingInvites;
type Tab = 'staff' | 'student' | 'phone';
const TABS: { value: Tab; label: string }[] = [
  { value: 'staff', label: L.tabs.staff },
  { value: 'student', label: L.tabs.students },
  { value: 'phone', label: L.tabs.phone },
];

interface Props {
  picked: readonly PickedInvitee[];
  onPicked: (list: PickedInvitee[]) => void;
}

/**
 * «المدعوون»: tabs «الفريق» / «الطلاب» / «رقم هاتف», the picked ones as removable chips, 30 at most.
 * Staff are notified in the app; a student's family and a typed phone get a WhatsApp chat message.
 */
export function InviteePicker({ picked, onPicked }: Props) {
  const [tab, setTab] = useState<Tab>('staff');
  const full = isFull(picked);
  const add = (item: PickedInvitee) => onPicked(addInvitee(picked, item));
  return (
    <section aria-label={L.invitees} className="grid gap-2.5">
      <h3 className="text-sm font-semibold">
        {L.invitees} <span className="tabular-nums text-ink-3">({picked.length})</span>
      </h3>
      <InviteeChips picked={picked} onRemove={(key) => onPicked(removeInvitee(picked, key))} />
      {full && <p className="text-xs text-ink-2">{L.maxInvitees}</p>}
      <Tabs label={L.addInvitees} tabs={TABS} value={tab} onChange={setTab} className="mb-1" />
      {tab === 'phone' ? (
        <PhoneInviteeInput onAdd={add} disabled={full} />
      ) : (
        <InviteeSearch key={tab} kind={tab} picked={picked} onAdd={add} disabled={full} />
      )}
    </section>
  );
}
