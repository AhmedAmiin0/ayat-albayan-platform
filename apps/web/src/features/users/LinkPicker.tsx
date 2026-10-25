import type { LinkCandidate, LinkKind } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Ltr } from '@/components/ui/display/ltr';
import { useDebounced } from '@/features/pricing/use-debounced';
import { t } from '@/lib/i18n';
import { candidatesQuery } from './api';

const L = t.users.link;

export interface LinkPickerProps {
  kind: LinkKind;
  value: LinkCandidate | null;
  onChange: (value: LinkCandidate | null) => void;
  error?: string | undefined;
  /** The record is fixed (the student's own profile): no «تغيير». */
  locked?: boolean;
}

const label = (c: LinkCandidate) => (
  <>
    {c.name}
    {c.code && (
      <>
        {' '}
        <Ltr>{c.code}</Ltr>
      </>
    )}
  </>
);

/** Picks the existing teacher / student / guardian (no login yet) by name or AB-nnnn code. */
export function LinkPicker({ kind, value, onChange, error, locked }: LinkPickerProps) {
  const [term, setTerm] = useState('');
  const q = useDebounced(term.trim(), 250);
  const found = useQuery({ ...candidatesQuery(kind, q), enabled: !value });
  if (value) {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-semibold text-ink-2">{L.chosen}</span>
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-rule px-3">
          <span className="min-w-0 truncate font-semibold text-ink">{label(value)}</span>
          {!locked && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              {L.change}
            </Button>
          )}
        </div>
      </div>
    );
  }
  const items = found.data ?? [];
  return (
    <div className="grid gap-2">
      <Field label={L.label} required error={error} hint={L.hint}>
        {(p) => <Input {...p} value={term} placeholder={L.placeholder} autoComplete="off" onChange={(e) => setTerm(e.target.value)} />}
      </Field>
      {found.isPending && <p className="text-xs text-ink-3">{L.searching}</p>}
      {found.data && items.length === 0 && <p className="text-xs text-ink-3">{L.empty}</p>}
      {items.length > 0 && (
        <ul className="grid max-h-56 gap-1 overflow-y-auto">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="min-h-11 w-full cursor-pointer rounded-md border border-rule px-3 text-start text-sm hover:bg-sunk"
                onClick={() => onChange(c)}
              >
                {label(c)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
