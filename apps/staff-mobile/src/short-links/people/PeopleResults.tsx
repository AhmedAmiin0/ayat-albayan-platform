import {
  inPeopleFilter,
  PEOPLE_SEARCH_MIN,
  type LinkPick,
  type PeopleFilter,
} from '@ab/client-core';
import type { ShortLinkPerson } from '@ab/shared';
import { t, InsetGroup, Note } from '@ab/mobile-kit';
import { PersonPick } from './PersonPick';

interface PeopleResultsProps {
  search: string;
  filter: PeopleFilter;
  /** GET /short-links/people for `search`; undefined while it loads or below the minimum. */
  found: ShortLinkPerson[] | undefined;
  picked: LinkPick[];
  onToggle: (person: LinkPick) => void;
}

const P = () => t.shortLinks.people;

/**
 * The picker's rows: under PEOPLE_SEARCH_MIN characters the people already picked (to untick),
 * then the matches of the search under the chosen chip.
 */
export function PeopleResults({ search, filter, found, picked, onToggle }: PeopleResultsProps) {
  const searching = search.trim().length >= PEOPLE_SEARCH_MIN;
  const rows = searching ? (found ?? []) : picked;
  const shown = rows.filter((p) => inPeopleFilter(filter, p.role));
  const isPicked = (id: string) => picked.some((p) => p.id === id);
  const empty = searching && found !== undefined && shown.length === 0;
  return (
    <>
      {searching ? null : <Note>{P().searchMin}</Note>}
      {empty ? <Note>{P().empty}</Note> : null}
      <InsetGroup testID="people-results">
        {shown.map((p) => (
          <PersonPick key={p.id} person={p} picked={isPicked(p.id)} onToggle={onToggle} />
        ))}
      </InsetGroup>
    </>
  );
}
