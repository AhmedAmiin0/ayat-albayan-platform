import { Link } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { usePickedChild } from './use-family-pick';

/**
 * The child a guardian of several works as, on top of every page (owner 2026-11-16): its name
 * opens «اختر الطالب» to switch. A gold-ringed pill on the dark header (boards). Nothing for a
 * student or a guardian of one child.
 */
export function ChildSwitch() {
  const child = usePickedChild();
  if (!child) return null;
  return (
    <Link
      to="/children"
      aria-label={t.portal.app.pick.open.replace('{name}', child.name)}
      className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-full border border-fam-gold/50
        bg-white/5 px-2.5 text-[15px] font-bold text-white transition-colors hover:bg-white/15
        shell:px-3.5"
    >
      <Icon name="users" className="size-[18px] shrink-0 text-fam-gold" aria-hidden="true" />
      <span className="truncate">{child.name}</span>
    </Link>
  );
}
