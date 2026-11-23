import { PEOPLE_SEARCH_MIN, type LinkPick } from '@ab/client-core';
import type { ShortLinkPerson } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { useId, useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { SearchInput } from '@ab/web-kit/components/ui/form/search-input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { usePeopleSearch } from '@/features/platform/short-links/api/use-short-links';
import { RoleTag } from '@/features/platform/short-links/shared/PersonLine';

const P = t.shortLinks.people;

interface PeoplePickerProps {
  picked: LinkPick[];
  onPick: (pick: LinkPick) => void;
}

function Match({ person, picked, onPick }: { person: ShortLinkPerson } & PeoplePickerProps) {
  const has = picked.some((p) => p.id === person.id);
  const pick = () => onPick({ id: person.id, name: person.name, role: person.role });
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-sunk">
      <span className="grid gap-0.5">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          {person.name}
          <RoleTag role={person.role} />
        </span>
        {person.phone && <Ltr className="text-xs text-ink-3">{formatPhone(person.phone)}</Ltr>}
      </span>
      <Button type="button" variant="ghost" size="sm" disabled={has} onClick={pick}>
        {has ? <Icon name="check" /> : <Icon name="plus" />}
        {has ? P.picked : t.shortLinks.form.add}
      </Button>
    </li>
  );
}

/** What the box says under it: too short, nothing found, or the matches. */
function Matches({ search, ...props }: { search: string } & PeoplePickerProps) {
  const people = usePeopleSearch(search);
  const short = search.trim().length < PEOPLE_SEARCH_MIN;
  if (short) return search.trim() ? <p className="text-xs text-ink-3">{P.searchMin}</p> : null;
  if (!people.data) return <p className="text-xs text-ink-3">{t.common.loading}</p>;
  if (people.data.length === 0) return <p className="text-xs text-ink-3">{P.empty}</p>;
  return (
    <ul
      aria-label={P.results}
      className="grid gap-0.5 rounded-md border border-rule bg-card p-1 shadow-pop"
    >
      {people.data.map((person) => (
        <Match key={person.id} person={person} {...props} />
      ))}
    </ul>
  );
}

/** «أضف من مستخدمي المنصة»: system users by name or number (GET /short-links/people). */
export function PeoplePicker({ picked, onPick }: PeoplePickerProps) {
  const id = useId();
  const [search, setSearch] = useState('');
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{t.shortLinks.form.addPeople}</label>
      <SearchInput
        id={id}
        placeholder={P.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Matches search={search} picked={picked} onPick={onPick} />
    </div>
  );
}
