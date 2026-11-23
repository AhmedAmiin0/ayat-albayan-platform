import type { MeetingInviteeOption } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { useDebounced } from '@/features/finance/pricing/use-debounced';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fromOption, hasInvitee, type PickedInvitee } from './invitee-list';
import { inviteeOptionsQuery } from './meeting-invites-api';

const L = t.meetingInvites;
const ROLES: Record<string, string | undefined> = t.activity.roles;

interface Props {
  kind: MeetingInviteeOption['kind'];
  picked: readonly PickedInvitee[];
  onAdd: (item: PickedInvitee) => void;
  disabled?: boolean;
}


export function InviteeSearch({ kind, picked, onAdd, disabled }: Props) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 250);
  const options = useQuery(inviteeOptionsQuery(q));
  const items = (options.data ?? []).filter((o) => o.kind === kind).slice(0, 8);
  return (
    <div className="grid gap-2">
      <Field label={L.search}>
        {(p) => <Input {...p} type="search" autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />}
      </Field>
      {options.isFetching && <p className="text-xs text-ink-3">{t.common.loading}</p>}
      {options.isSuccess && items.length === 0 && <p className="text-sm text-ink-2">{L.noOptions}</p>}
      {items.length > 0 && (
        <ul className="grid max-h-56 divide-y divide-rule overflow-y-auto rounded-md border border-rule">
          {items.map((o) => {
            const item = fromOption(o);
            const added = hasInvitee(picked, item.key);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  aria-pressed={added}
                  disabled={added || disabled}
                  onClick={() => onAdd(item)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-start hover:bg-sunk disabled:opacity-60"
                >
                  <span className="font-semibold text-ink">{o.name}</span>
                  {o.kind === 'staff' ? (
                    <span className="text-xs text-ink-3">{ROLES[o.role] ?? o.role}</span>
                  ) : (
                    <Ltr className="text-xs text-ink-3">{o.code}</Ltr>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
