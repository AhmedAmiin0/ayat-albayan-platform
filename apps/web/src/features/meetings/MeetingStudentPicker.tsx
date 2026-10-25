import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { IconButton } from '@/components/ui/form/icon-button';
import { Icon } from '@/components/ui/display/icon';
import { Ltr } from '@/components/ui/display/ltr';
import { studentListQuery } from '@/features/students/api';
import { StudentSearch } from '@/features/students/StudentSearch';
import { t } from '@/lib/i18n/i18n';
import { toggleStudent, type MeetingStudent } from './instant-form';

interface Props {
  picked: readonly MeetingStudent[];
  onPicked: (students: MeetingStudent[]) => void;
}

/** The students of the instant lesson: the usual student search, each result a toggle, the picked ones as removable chips. */
export function MeetingStudentPicker({ picked, onPicked }: Props) {
  const [term, setTerm] = useState('');
  const query = useQuery({ ...studentListQuery(term, 1), enabled: term !== '' });
  const items = term ? (query.data?.items ?? []) : [];
  const isPicked = (id: string) => picked.some((s) => s.id === id);
  return (
    <section className="grid gap-2.5" aria-label={t.meetings.students}>
      <h3 className="text-sm font-semibold">{t.meetings.students}</h3>
      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {picked.map((s) => (
            <li key={s.id} className="flex items-center gap-1 rounded-full border border-rule bg-sunk ps-3 text-sm">
              <span>{s.name}</span>
              <IconButton label={t.meetings.remove.replace('{name}', s.name)} onClick={() => onPicked(toggleStudent(picked, s))}>
                <Icon name="x" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <StudentSearch initial="" onSearch={setTerm} live />
      {term && query.isFetching && <p className="text-xs text-ink-3">{t.common.loading}</p>}
      {term && query.data && items.length === 0 && <p className="text-sm text-ink-2">{t.students.empty}</p>}
      {items.length > 0 && (
        <ul className="grid max-h-56 gap-1 overflow-y-auto">
          {items.map((s) => (
            <li key={s.id}>
              <label className="flex min-h-11 items-center gap-2.5 rounded-md px-2.5 hover:bg-sunk">
                <input
                  type="checkbox"
                  checked={isPicked(s.id)}
                  onChange={() => onPicked(toggleStudent(picked, { id: s.id, name: s.name, code: s.code, program: s.program }))}
                  className="size-4 accent-[var(--lapis)]"
                />
                <span className="font-semibold">{s.name}</span>
                {s.code && <Ltr className="text-xs text-ink-3">{s.code}</Ltr>}
                <span className="text-xs text-ink-3">{s.guardian_name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
