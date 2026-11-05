import { formatPhone, type FamilyOption } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';

const E = t.peopleEdit;

export interface FamilyResultsProps {
  families: readonly FamilyOption[];
  /** The student's own family: listed, never pickable. */
  currentId: string;
  picked: string | null;
  onPick: (family: FamilyOption) => void;
}

/** The guardian picker's answers: name, main number and children; one is picked. */
export function FamilyResults({ families, currentId, picked, onPick }: FamilyResultsProps) {
  if (families.length === 0) return <p className="text-ink-3">{E.noResults}</p>;
  return (
    <ul className="grid gap-2" aria-label={E.attach}>
      {families.map((f) => (
        <li key={f.id} className="grid gap-0.5 rounded-md border border-input p-2">
          <label className="flex cursor-pointer items-center gap-2 font-semibold">
            <input
              type="radio"
              name="family"
              checked={picked === f.id}
              disabled={f.id === currentId}
              onChange={() => onPick(f)}
            />
            <bdi>{f.name}</bdi>
          </label>
          <Ltr className="text-sm text-ink-2">{formatPhone(f.phone_e164)}</Ltr>
          <span className="text-sm text-ink-3">
            {E.children.replace('{names}', f.students.map((s) => s.name).join(t.common.listSeparator))}
          </span>
        </li>
      ))}
    </ul>
  );
}
