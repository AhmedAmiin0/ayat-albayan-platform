import type { NotificationEntryView } from '@ab/shared';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { stateChip } from '../../notification-catalogue/catalogue-text';
import { NamePart } from '../cells/NamePart';
import { editableRule } from '../RuleRow';
import { fillText, reasonText } from '../rule-text';
import { useRules } from '../rules-context';
import { onOffWord } from '../switch/RuleSwitchInput';

const r = t.notificationRules;
const cell = 'border-b border-rule px-2 py-2.5 text-start align-top';

/** The switch column's word on a phone: «لا يمكن إيقافه», or «مفعّل» / «مغلق». */
function switchWord(entry: NotificationEntryView): string {
  if (entry.locked) return r.locked;
  return onOffWord(entry.rule ? entry.rule.enabled : entry.blocker !== 'row_off');
}

/**
 * The phone row (below 640px, docs/26b §3 «Phone»): الإشعار | التشغيل. Under the name the state and
 * its short reason; the second cell is one 44px button that opens the row's bottom sheet (a tap
 * anywhere on the row opens it too).
 */
export function RulePhoneRow({ entry, onOpen }: { entry: NotificationEntryView; onOpen: (key: string) => void }) {
  const canEdit = editableRule(entry, useRules().canManage) !== null;
  const name = t.notificationCatalogue.entries[entry.key].name;
  const reason = reasonText(entry);
  const word = switchWord(entry);
  return (
    <tr data-key={entry.key} className="cursor-pointer" onClick={() => onOpen(entry.key)}>
      <th scope="row" abbr={name} className={`${cell} font-normal`}>
        <NamePart entry={entry} />
        <span className="mt-1 block text-xs text-ink-2">
          {stateChip(entry).label}
          {reason && ` · ${reason}`}
        </span>
      </th>
      <td className={cell}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${fillText(canEdit ? r.phoneOpen : r.phoneView, { name })}: ${word}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(entry.key);
          }}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-start text-sm text-ink"
        >
          <span>{word}</span>
          <Icon name="chevron-left" className="shrink-0 text-ink-3" />
        </button>
      </td>
    </tr>
  );
}
