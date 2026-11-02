import { formatPhone, type PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Note } from '@/more';
import { removeSecondPhone, usePeopleWrite } from './people-edit-api';

const E = t.peopleEdit;

/** The family's second number, «حذف الرقم الثاني» behind an inline confirm; nothing without one. */
export function SecondPhoneRow({
  guardian,
  onDone,
}: {
  guardian: PeopleEditView['guardian'];
  onDone: (notice: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const remove = usePeopleWrite(removeSecondPhone, () => onDone(E.saved));
  const second = guardian.phones.find((p) => !p.is_primary);
  if (!second) return null;
  const phone = ltr(formatPhone(second.phone_e164));
  const run = () => remove.mutate({ guardianId: guardian.id, phone: second.phone_e164 });
  return (
    <View style={{ gap: 8 }}>
      <Note>{`${E.fields.secondPhone}: ${phone}`}</Note>
      {asking ? (
        <InlineConfirm
          message={E.removeSecondConfirm.replace('{phone}', phone)}
          confirmLabel={E.removeSecond}
          busy={remove.isPending}
          tone="danger"
          onConfirm={run}
          onCancel={() => setAsking(false)}
        />
      ) : (
        <Button variant="secondary" label={E.removeSecond} onPress={() => setAsking(true)} />
      )}
      {remove.errorText ? <Note alert>{remove.errorText}</Note> : null}
    </View>
  );
}
