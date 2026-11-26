import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Icon, presenceOrder, withOnline, usePresenceWatch, t, cn } from '@ab/web-kit';
import { meQuery } from '@/features/people/auth';
import { staffPresenceQuery } from '@/features/platform/presence/api';
import { usePresenceClock } from '@/features/platform/presence/use-presence-clock';
import { StaffPresenceBody } from './StaffPresenceBody';

/** Only a base-role admin is shown the staff (docs/33 §2). */
export function StaffPresencePanel() {
  const role = useQuery(meQuery).data?.role;
  return role === 'admin' ? <StaffPresenceCard /> : null;
}

/** Watches at most PRESENCE_WATCH_MAX topics. */
function StaffPresenceCard() {
  const [open, setOpen] = useState(true);
  const id = useId();
  const query = useQuery(staffPresenceQuery);
  const data = query.data;
  const staff = data?.enabled === true ? data.staff : [];
  const watch = usePresenceWatch(staff.map((row) => row.profile_id));
  const clock = usePresenceClock();
  const rows = presenceOrder(withOnline(staff, { watch, now: clock.now }));
  const count = rows.filter((row) => row.online).length;
  const p = t.presence;
  return (
    <section aria-labelledby={id} className="mb-3 rounded-lg border border-rule bg-raised">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-start"
      >
        <Icon name="chevron-down" className={cn('transition-transform', open && 'rotate-180')} />
        <span id={id} className="text-sm font-semibold">
          {p.staffTitle}
        </span>
        {data?.enabled === true && (
          <span className="ms-auto text-2xs text-ink-3 tabular-nums">
            {p.staffOnline.replace('{n}', String(count))}
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-rule px-3 py-2">
          <StaffPresenceBody query={query} rows={rows} clock={clock} />
        </div>
      )}
    </section>
  );
}
