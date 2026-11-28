import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { PeopleListProps } from './PeopleList.types';
import { cameraTiles } from './people-list.helpers';
import { PersonRow } from './PersonRow';

/** Read only for the family; mic and camera state in words. */
export function PeopleList({ tiles, variant }: PeopleListProps) {
  const people = cameraTiles(tiles);
  return (
    <ul aria-label={t.classroom.people} className="px-4">
      {people.map((tile) => (
        <PersonRow key={tile.key} tile={tile} variant={variant} />
      ))}
    </ul>
  );
}
