import { useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { fromPhone, type PickedInvitee } from './invitee-list';

const L = t.meetingInvites;

/** «رقم هاتف»: a typed number, kept only when it is a valid E.164 number (rule 7). */
export function PhoneInviteeInput({ onAdd, disabled }: { onAdd: (item: PickedInvitee) => void; disabled?: boolean }) {
  const [phone, setPhone] = useState('');
  const [invalid, setInvalid] = useState(false);
  const add = (e?: SyntheticEvent) => {
    e?.preventDefault();
    const item = fromPhone(phone);
    setInvalid(!item);
    if (!item) return;
    onAdd(item);
    setPhone('');
  };
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Field label={L.tabs.phone} {...(invalid && { error: L.invalidPhone })}>
          {(p) => (
            <Input
              {...p}
              type="tel"
              dir="ltr"
              autoComplete="off"
              placeholder={L.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add(e);
              }}
            />
          )}
        </Field>
      </div>
      <Button type="button" variant="secondary" disabled={disabled || !phone.trim()} onClick={() => add()}>
        {L.addPhone}
      </Button>
    </div>
  );
}
