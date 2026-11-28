import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RowMenu } from './RowMenu';
import type { RowMenuItem } from './RowMenu.types';

const noop = () => undefined;

/** Staff: a payment row; customer: a guardian's own receipt row (family web). */
const CASES: { key: string; dir: 'rtl' | 'ltr'; name: string; items: RowMenuItem[] }[] = [
  {
    key: 'staff',
    dir: 'rtl',
    name: 'طالب',
    items: [
      { id: 'receipt', label: t.payments.viewReceipt, onSelect: noop },
      { id: 'amount', label: t.payments.editAmount.action, onSelect: noop },
      { id: 'delete', label: t.common.delete, onSelect: noop, danger: true },
      { id: 'edit', label: t.payments.editDetails, onSelect: noop },
    ],
  },
  {
    key: 'customer',
    dir: 'rtl',
    name: 'Student',
    items: [{ id: 'receipt', label: t.payments.viewReceipt, onSelect: noop }],
  },
  {
    key: 'ltr',
    dir: 'ltr',
    name: 'Student',
    items: [
      { id: 'edit', label: t.common.edit, detail: 'key_name', onSelect: noop },
      { id: 'delete', label: t.common.delete, onSelect: noop, danger: true },
    ],
  },
  { key: 'empty', dir: 'rtl', name: 'طالب', items: [] },
];

/** Every state in both directions; dark mode and reduced motion follow the page settings. */
export function RowMenuShowcase() {
  return (
    <div className="grid gap-4 p-4">
      {CASES.map((c) => (
        <div key={c.key} dir={c.dir} className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-2">{c.key}</span>
          <RowMenu label={t.common.rowActions.replace('{name}', c.name)} items={c.items} />
        </div>
      ))}
    </div>
  );
}
