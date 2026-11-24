import {
  PEOPLE_FILTERS,
  withoutPerson,
  withoutPhone,
  withPerson,
  withPhone,
  type LinkPick,
  type PeopleFilter,
} from '@ab/client-core';
import { formatPhone } from '@ab/core';
import { useState } from 'react';
import { t, Button, FilterPills, InsetGroup } from '@ab/mobile-kit';
import { SearchField } from '@/core/ui/form/SearchField';
import { useLinkPeople } from '@/short-links/api/link-hooks';
import { PersonRow } from '@/short-links/ui/PersonRow';
import { Sheet } from '@/short-links/ui/Sheet';
import { PeopleResults } from './PeopleResults';
import { PhoneAdder } from './PhoneAdder';

export interface PeoplePicked {
  people: LinkPick[];
  phones: string[];
}

interface PeopleSheetProps extends PeoplePicked {
  /** The form's allowed user limit, for the picked count. */
  maxUsers: number | null;
  onDone: (picked: PeoplePicked) => void;
  onClose: () => void;
}

const P = () => t.shortLinks.people;

const doneLabel = (n: number, max: number | null): string =>
  max === null
    ? P().done.replace('{n}', String(n))
    : P().doneOf.replace('{n}', String(n)).replace('{max}', String(max));

const unlisted = (phone: string) => ({
  name: null,
  role: null,
  phone,
  matched: false,
  unregistered: true,
});

function PhoneList({ phones, onRemove }: { phones: string[]; onRemove: (e164: string) => void }) {
  return (
    <InsetGroup>
      {phones.map((phone) => (
        <PersonRow
          key={phone}
          look={unlisted(phone)}
          trailing={
            <Button
              variant="ghost"
              label={t.common.delete}
              accessibilityLabel={t.shortLinks.form.remove.replace('{name}', formatPhone(phone))}
              onPress={() => onRemove(phone)}
            />
          }
        />
      ))}
    </InsetGroup>
  );
}

export function PeopleSheet({ maxUsers, onDone, onClose, ...start }: PeopleSheetProps) {
  const [people, setPeople] = useState(start.people);
  const [phones, setPhones] = useState(start.phones);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const found = useLinkPeople(search);
  const toggle = (person: LinkPick) =>
    setPeople((list) =>
      list.some((p) => p.id === person.id)
        ? withoutPerson(list, person.id)
        : withPerson(list, person),
    );
  const done = doneLabel(people.length + phones.length, maxUsers);
  return (
    <Sheet
      title={P().title}
      testID="people-sheet"
      onClose={onClose}
      footer={<Button label={done} onPress={() => onDone({ people, phones })} />}
    >
      <SearchField label={P().search} onSearch={setSearch} />
      <FilterPills
        items={PEOPLE_FILTERS.map((f) => ({ value: f, label: P().filters[f] }))}
        value={filter}
        onChange={setFilter}
        accessibilityLabel={P().title}
      />
      <PeopleResults
        search={search}
        filter={filter}
        found={found.data}
        picked={people}
        onToggle={toggle}
      />
      <PhoneAdder onAdd={(e164) => setPhones((list) => withPhone(list, e164))} />
      <PhoneList phones={phones} onRemove={(e164) => setPhones((l) => withoutPhone(l, e164))} />
    </Sheet>
  );
}
