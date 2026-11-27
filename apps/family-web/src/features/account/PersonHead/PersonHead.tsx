import { Link } from '@tanstack/react-router';
import { Avatar, Icon, Card, t } from '@ab/web-kit';
import type { Props } from './PersonHead.types';

/** The whole card opens the profile, as the family app's card does. */
export function PersonHead({ name, role, detail }: Props) {
  return (
    <Card asChild pressable>
      <Link to="/profile" className="flex min-h-11 items-center gap-4 p-4">
        {role && <Avatar name={name} size="lg" decorative />}
        <div className="grid min-w-0 flex-1 gap-0.5">
          {role && <p className="text-xs font-medium text-ink-3">{role}</p>}
          <h2 className="font-display text-h3 font-bold">{name}</h2>
          {detail && <p className="text-sm text-ink-2">{detail}</p>}
          <span className="sr-only">{t.portal.app.profile.open}</span>
        </div>
        <Icon name="chevron-left" className="size-4 shrink-0 text-ink-3" />
      </Link>
    </Card>
  );
}
