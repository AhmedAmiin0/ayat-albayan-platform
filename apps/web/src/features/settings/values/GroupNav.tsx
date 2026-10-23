import { useEffect, useRef } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { GROUP_IDS, groupLabel, isOwnedGroup, type ValuesGroupId } from './value-groups-view';

const v = t.settingsValues;

export interface GroupNavProps {
  /** The group in view; null while «الكل» (a search or filter) is shown. */
  current: ValuesGroupId | null;
  counts: Partial<Record<ValuesGroupId, number>>;
  /** «الكل» and its result count, only while searching or filtering. */
  allCount?: number | undefined;
  onPick: (id: ValuesGroupId) => void;
  /** Phones: a strip of 44px chips that scrolls sideways; desktop: the side list. */
  phone?: boolean;
}

// The selected group also carries a green rule (inline-start on the side list, under a phone chip),
// so it does not rely on the tint alone; the others reserve its room so nothing shifts.
const itemClass = (on: boolean, phone: boolean | undefined) =>
  cn(
    'flex min-h-11 items-center justify-between gap-3 rounded-md text-sm whitespace-nowrap',
    phone ? 'shrink-0 border border-b-2 border-rule px-3.5' : 'w-full border-s-[3px] border-s-transparent px-3 text-start sm:min-h-9',
    phone && on && 'border-b-lapis',
    !phone && on && 'border-s-lapis',
    on ? 'bg-gold-wash font-semibold text-ink ring-1 ring-inset ring-gold-soft' : 'text-ink-2 hover:bg-sunk',
  );

function Item({ id, on, count, onPick, phone }: { id: ValuesGroupId; on: boolean; count?: number | undefined; onPick: GroupNavProps['onPick']; phone?: boolean | undefined }) {
  return (
    <button type="button" aria-current={on || undefined} data-group={id} className={itemClass(on, phone)} onClick={() => onPick(id)}>
      <span>{groupLabel(id)}</span>
      {count !== undefined && <span className="text-xs text-ink-3 tabular-nums">{count}</span>}
    </button>
  );
}

/** The group list (docs/26b §2): one group per view; «تُدار من صفحة أخرى» under its own heading. */
export function GroupNav({ current, counts, allCount, onPick, phone }: GroupNavProps) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    // Phones: the selected chip may start out of view; bring it in (docs/26b §7b).
    const on = box.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (phone && on && typeof on.scrollIntoView === 'function') on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [phone, current]);
  const items = (ids: readonly ValuesGroupId[]) =>
    ids.map((id) => <Item key={id} id={id} on={id === current} count={counts[id]} onPick={onPick} phone={phone} />);
  const all = allCount !== undefined && (
    <span aria-current="true" className={itemClass(true, phone)}>
      <span>{v.all}</span>
      <span className="text-xs text-ink-3 tabular-nums">{allCount}</span>
    </span>
  );
  if (phone) {
    return (
      <nav ref={box} aria-label={v.groupsNav} className="-mx-3 -my-1 flex gap-2 overflow-x-auto px-3 py-1">
        {all}
        {items(GROUP_IDS)}
      </nav>
    );
  }
  return (
    <nav ref={box} aria-label={v.groupsNav} className="grid content-start gap-0.5">
      <span className="px-3 pb-1 text-xs font-semibold text-ink-3">{v.groupsTitle}</span>
      {all}
      {items(GROUP_IDS.filter((id) => !isOwnedGroup(id) && id !== 'custom'))}
      <hr className="my-2 border-rule" />
      {items(['custom'])}
      <hr className="my-2 border-rule" />
      <span className="px-3 pb-1 text-xs font-semibold text-ink-3">{v.ownedHeading}</span>
      {items(GROUP_IDS.filter(isOwnedGroup))}
    </nav>
  );
}
