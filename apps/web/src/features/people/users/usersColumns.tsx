import type { UserView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { formatDateTime } from '@/features/sales/leads/format';
import { t } from '@/lib/i18n/i18n';

const col = createColumnHelper<DataTableFeatures, UserView>();
const C = t.users.cols;
const quiet = (phone: string) => `text-xs text-ink-2 ${phone}`;

/** Phone rows: name + status, then email, username, role, linked record, phone and last sign-in. */
const stacked = {
  name: 'max-sm:order-1 max-sm:flex-[1_1_60%] max-sm:text-base',
  status: 'max-sm:order-2 max-sm:basis-[35%] max-sm:text-end',
  email: 'max-sm:order-3 max-sm:basis-full',
  username: 'max-sm:order-3',
  role: 'max-sm:order-4',
  linked: 'max-sm:order-5',
  phone: 'max-sm:order-6',
  last: 'max-sm:order-7',
};

/** The users table. The name is a button (keyboard path to the panel); a click on the row opens it too. */
export function usersColumns(onOpen: (userId: string) => void) {
  return col.columns([
    col.accessor('full_name', {
      header: () => C.name,
      cell: (c) => (
        <button
          type="button"
          className="block cursor-pointer text-start font-semibold text-ink hover:underline max-sm:min-h-11"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(c.row.original.id);
          }}
        >
          {c.getValue()}
        </button>
      ),
      meta: { className: stacked.name },
    }),
    col.accessor('email', {
      header: () => C.email,
      cell: (c) => (c.getValue() ? <Ltr>{c.getValue()}</Ltr> : '—'),
      meta: { className: quiet(stacked.email) },
    }),
    col.accessor((u) => u.username ?? null, {
      id: 'username',
      header: () => t.familyAuth.usersColumn,
      cell: (c) => (c.getValue() ? <Ltr>{c.getValue()}</Ltr> : '—'),
      meta: { className: quiet(stacked.username) },
    }),
    col.accessor('phone_e164', {
      header: () => C.phone,
      cell: (c) => (c.getValue() ? <Ltr>{c.getValue()}</Ltr> : '—'),
      meta: { className: quiet(stacked.phone) },
    }),
    col.accessor('role', {
      header: () => C.role,
      cell: (c) => t.activity.roles[c.getValue()],
      meta: { className: quiet(stacked.role) },
    }),
    col.display({
      id: 'linked',
      header: () => C.linked,
      cell: (c) => {
        const linked = c.row.original.linked;
        if (!linked) return '—';
        return (
          <>
            {linked.name}
            {linked.code && (
              <>
                {' '}
                <Ltr>{linked.code}</Ltr>
              </>
            )}
          </>
        );
      },
      meta: { className: quiet(stacked.linked) },
    }),
    col.accessor('status', {
      header: () => C.status,
      cell: (c) => <StatusChip tone={c.getValue() === 'active' ? 'ok' : 'bad'} glyph={c.getValue() === 'active' ? 'fill' : 'struck'} label={t.users.status[c.getValue()]} />,
      meta: { className: stacked.status },
    }),
    col.accessor('last_sign_in_at', {
      header: () => C.lastSignIn,
      cell: (c) => (c.getValue() ? formatDateTime(c.getValue()) : t.users.never),
      meta: { className: quiet(stacked.last) },
    }),
  ]);
}
