import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { iconButtonClass } from '@/components/ui/form/icon-button';
import { useDismiss } from '@/components/ui/overlay/use-dismiss';
import { cn } from '@/lib/utils';

export interface RowMenuItem {
  id: string;
  label: string;
  /** A second line, e.g. the developer key (LTR). */
  detail?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * The row's «⋯» menu (docs/26b §2 «إجراء»): a menu button with arrow-key, Home/End, Esc and Tab
 * handling; a pick or Esc puts focus back on the button (a dialog the pick opens returns there).
 */
export function RowMenu({ label, items }: { label: string; items: readonly RowMenuItem[] }) {
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
  useEffect(() => {
    if (open) refs.current[0]?.focus();
  }, [open]);
  const move = (e: KeyboardEvent, from: number) => {
    const n = items.length;
    const to = { ArrowDown: from + 1, ArrowUp: from - 1 + n, Home: 0, End: n - 1 }[e.key];
    if (e.key === 'Tab') return close(false);
    if (to === undefined) return;
    e.preventDefault();
    refs.current[to % n]?.focus();
  };
  return (
    <div ref={box} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(iconButtonClass, 'sm:size-8')}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute end-0 top-full z-30 mt-1 grid w-max min-w-52 max-w-[calc(100vw-2rem)] gap-0.5 rounded-md border border-rule bg-card p-1.5 shadow-pop"
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onKeyDown={(e) => move(e, i)}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              className={cn(
                'grid min-h-11 gap-0.5 rounded-sm px-3 py-1.5 text-start text-sm hover:bg-sunk focus-visible:bg-sunk sm:min-h-9',
                item.danger ? 'text-danger' : 'text-ink',
              )}
            >
              <span>{item.label}</span>
              {item.detail && <span className="text-2xs text-ink-3">{item.detail}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
