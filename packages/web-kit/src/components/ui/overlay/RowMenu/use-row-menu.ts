import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDismiss } from '@ab/web-kit/components/ui/overlay/use-dismiss';
import { useFocusOnChange } from '@ab/web-kit/components/ui/overlay/use-focus-on-change';
import type { RowMenuItem } from './RowMenu.types';

const dangerLast = (items: readonly RowMenuItem[]): RowMenuItem[] => [
  ...items.filter((i) => !i.danger),
  ...items.filter((i) => i.danger),
];

const KEY_STEP: Readonly<Record<string, (from: number, n: number) => number>> = {
  ArrowDown: (from) => from + 1,
  ArrowUp: (from, n) => from - 1 + n,
  Home: () => 0,
  End: (_from, n) => n - 1,
};

/** Arrow, Home/End, Esc and Tab (docs/26b §2); focus goes back to the button on Esc or a pick. */
export function useRowMenu(items: readonly RowMenuItem[]) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const close = (focus: boolean) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
  };
  useDismiss(box, { open, onDismiss: (how) => close(how === 'escape') });
  const first = useRef<HTMLButtonElement | null>(null);
  useFocusOnChange(first, open);
  const setItem = (i: number, el: HTMLButtonElement | null) => {
    refs.current[i] = el;
    if (i === 0) first.current = el;
  };
  const move = (e: KeyboardEvent, from: number) => {
    const step = KEY_STEP[e.key];
    if (e.key === 'Tab') close(false);
    if (!step) return;
    e.preventDefault();
    refs.current[step(from, refs.current.length) % refs.current.length]?.focus();
  };
  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' || open) return;
    e.preventDefault();
    setOpen(true);
  };
  const pick = (item: RowMenuItem) => {
    close(true);
    item.onSelect();
  };
  return {
    open,
    menuId,
    box,
    trigger,
    setItem,
    sorted: dangerLast(items),
    toggle: () => setOpen((o) => !o),
    onTriggerKey,
    move,
    pick,
  };
}
