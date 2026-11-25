import { useState } from 'react';
import { Tabs } from '@ab/web-kit/components/ui/layout/tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { InviteeChips } from './InviteeChips';
import { addInvitee, isFull, removeInvitee, type PickedInvitee } from './invitee-list';
import { InviteeSearch } from './InviteeSearch';
import { PhoneInviteeInput } from './PhoneInviteeInput';
import { useMayInvitePhones } from './use-may-invite-phones';

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

/** 30 at most; the API decides whether WhatsApp can be sent, else a link to copy. */
export function InviteePicker({ picked, onPicked }: Props) {
  const [tab, setTab] = useState<Tab>('staff');
  const phones = useMayInvitePhones();
  const tabs = phones ? TABS : TABS.filter((x) => x.value !== 'phone');
  const shown: Tab = phones || tab !== 'phone' ? tab : 'staff';
  const full = isFull(picked);
  const add = (item: PickedInvitee) => onPicked(addInvitee(picked, item));
  return (
    <section aria-label={L.invitees} className="grid gap-2.5">
      <h3 className="text-sm font-semibold">
        {L.invitees} <span className="tabular-nums text-ink-3">({picked.length})</span>
      </h3>
      <InviteeChips picked={picked} onRemove={(key) => onPicked(removeInvitee(picked, key))} />
      {full && <p className="text-xs text-ink-2">{L.maxInvitees}</p>}
      <Tabs label={L.addInvitees} tabs={tabs} value={shown} onChange={setTab} className="mb-1" />
      {shown === 'phone' ? (
        <PhoneInviteeInput onAdd={add} disabled={full} />
      ) : (
        <InviteeSearch key={shown} kind={shown} picked={picked} onAdd={add} disabled={full} />
      )}
    </section>
  );
}
