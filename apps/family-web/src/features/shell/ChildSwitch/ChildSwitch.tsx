import { Link } from '@tanstack/react-router';
import { Icon, t } from '@ab/web-kit';
import { usePickedChild } from '@/features/shell/use-family-pick';

/** Nothing for a student or a guardian of one child. */
export function ChildSwitch() {
  const child = usePickedChild();
  if (!child) return null;
  return (
    <Link
      to="/children"
      aria-label={t.portal.app.pick.open.replace('{name}', child.name)}
      className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm font-semibold
        text-ink hover:bg-sunk"
    >
      <Icon name="users" className="size-4 shrink-0" aria-hidden="true" />
      <span dir="auto" className="truncate">{child.name}</span>
    </Link>
  );
}
