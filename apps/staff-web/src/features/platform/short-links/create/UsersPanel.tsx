import {
  fillSlots, withoutPerson, withoutPhone, withPerson, withPhone, type LinkFieldErrors,
  type LinkForm,
} from '@ab/client-core';
import { FormAlert, t } from '@ab/web-kit';
import { errorText } from '@/features/platform/short-links/shared/link-errors';
import { PeoplePicker } from './PeoplePicker';
import { PhoneAdd } from './PhoneAdd';
import { PickedList } from './PickedList';

const F = t.shortLinks.form;

type LinkUsers = Pick<LinkForm, 'people' | 'phones'>;

interface UsersPanelProps {
  users: LinkUsers;
  onChange: (next: Partial<LinkUsers>) => void;
  errors: LinkFieldErrors;
}

export function UsersPanel({ users, onChange, errors }: UsersPanelProps) {
  const { people, phones } = users;
  const error = errorText(errors, 'people') ?? errorText(errors, 'phones');
  return (
    <section className="grid gap-4 rounded-md border border-rule bg-sunk/60 p-3.5">
      <h3 className="text-sm font-semibold">
        {fillSlots(F.listed, { n: people.length + phones.length })}
      </h3>
      <PickedList
        people={people}
        phones={phones}
        onRemovePerson={(id) => onChange({ people: withoutPerson(people, id) })}
        onRemovePhone={(e164) => onChange({ phones: withoutPhone(phones, e164) })}
      />
      <p className="text-xs text-ink-3">{F.listedHint}</p>
      {error && <FormAlert>{error}</FormAlert>}
      <PeoplePicker
        picked={people}
        onPick={(pick) => onChange({ people: withPerson(people, pick) })}
      />
      <PhoneAdd onAdd={(e164) => onChange({ phones: withPhone(phones, e164) })} />
    </section>
  );
}
