import { cn } from '@ab/web-kit/lib/utils';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { iconButtonClass } from '@ab/web-kit/components/ui/form/IconButton';
import type { RowMenuProps } from './RowMenu.types';
import { useRowMenu } from './use-row-menu';

/** One menu for a row's actions: rows keep one height and a delete is never a lone red button. */
export function RowMenu({ label, items }: RowMenuProps) {
  const m = useRowMenu(items);
  if (items.length === 0) return null;
  return (
    <div ref={m.box} className="relative inline-block">
      <button
        ref={m.trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={m.open}
        aria-controls={m.open ? m.menuId : undefined}
        onClick={m.toggle}
        onKeyDown={m.onTriggerKey}
        className={iconButtonClass}
      >
        <Icon name="more" />
      </button>
      {m.open && (
        <div
          id={m.menuId}
          role="menu"
          aria-label={label}
          className="absolute end-0 top-full z-30 mt-1 grid w-max min-w-52 max-w-[calc(100vw-2rem)] gap-0.5 rounded-md border border-rule bg-card p-1.5 shadow-pop"
        >
          {m.sorted.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => m.setItem(i, el)}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onKeyDown={(e) => m.move(e, i)}
              onClick={() => m.pick(item)}
              className={cn(
                'grid min-h-11 gap-0.5 rounded-sm px-3 py-1.5 text-start text-sm hover:bg-sunk focus-visible:bg-sunk sm:min-h-9 pointer-coarse:min-h-11',
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
