import { roleKey, type LinkPick } from '@ab/client-core';
import { Checkbox } from '@ab/mobile-kit';
import { PersonRow } from '@/short-links/ui/PersonRow';

interface PersonPickProps {
  person: LinkPick;
  picked: boolean;
  onToggle: (person: LinkPick) => void;
}

/** A system user in the picker: a checkbox row, by name and role (board LinkXStaffPeople). */
export function PersonPick({ person, picked, onToggle }: PersonPickProps) {
  const role = roleKey(person.role);
  const look = { name: person.name, role, phone: null, matched: false, unregistered: false };
  return (
    <Checkbox
      label={person.name}
      checked={picked}
      onChange={() => onToggle(person)}
      side="end"
      inset
    >
      <PersonRow look={look} id={person.id} />
    </Checkbox>
  );
}
