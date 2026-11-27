import { t, cn, Card } from '@ab/web-kit';
import type { Props } from './AlertRow.types';
import { useAlertRow } from './use-alert-row';

/** One bell row: unread dot, title, body and time; a tap marks it read and opens its page. */
export function AlertRow({ alert, kind, tz, onRead }: Props) {
  const { when, open, unread } = useAlertRow({ alert, kind, tz, onRead });
  return (
    <li>
      <Card asChild pressable>
        <button
          type="button"
          onClick={open}
          data-unread={unread || undefined}
          className={cn(
            'relative grid w-full gap-1 p-3 ps-4',
            // Unread: a lapis bar at the inline-start and the title in semibold ink (not a tint
            // alone: a tint gave read vs unread a 1.00:1 contrast); read: the title in ink-2.
            'before:absolute before:inset-y-3 before:start-1 before:w-1 before:rounded-full',
            unread && 'before:bg-lapis',
          )}
        >
          <span
            className={cn(
              'flex items-center gap-2',
              unread ? 'font-semibold text-ink' : 'font-medium text-ink-2',
            )}
          >
            {unread && (
              <span className="size-2 shrink-0 rounded-full bg-lapis" aria-label={t.bell.unread} />
            )}
            {alert.title}
          </span>
          <span className="text-sm text-pretty text-ink-2">{alert.body}</span>
          <span className="text-xs text-ink-3 tabular-nums">{when}</span>
        </button>
      </Card>
    </li>
  );
}
