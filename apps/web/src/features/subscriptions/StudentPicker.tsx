import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Ltr } from '@/components/ui/display/ltr';
import { useDebounced } from '@/features/pricing/use-debounced';
import { studentListQuery } from '@/features/students/api';
import { t } from '@/lib/i18n/i18n';

export type PickedStudent = { id: string; name: string; code: string | null };

/** Search by name, phone or code (the students list API) and pick one student. */
export function StudentPicker({ onPick }: { onPick: (student: PickedStudent) => void }) {
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 250);
  const list = useQuery({ ...studentListQuery(query, 1), enabled: query.length > 0 });
  const items = list.data?.items.slice(0, 6) ?? [];

  return (
    <div className="grid gap-2">
      <Field label={t.payments.mobile.chooseStudent}>
        {(p) => (
          <Input
            {...p}
            type="search"
            autoComplete="off"
            placeholder={t.students.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </Field>
      {items.length > 0 && (
        <ul className="grid divide-y divide-rule rounded-md border border-rule">
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick({ id: s.id, name: s.name, code: s.code })}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-start hover:bg-sunk"
              >
                <span className="font-semibold text-ink">{s.name}</span>
                <span className="text-xs text-ink-3">
                  <Ltr>{s.code ?? ''}</Ltr> · {s.guardian_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
