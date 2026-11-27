import type { FamilyRequestView } from '@ab/schedule';
import { t, whenText, type ViewerClock } from '@ab/mobile-kit';
import { whenIn } from '@/core/lib/clock';

export const requestWho = (r: FamilyRequestView): string =>
  r.students.map((s) => `${s.name} ${s.code}`).join(t.common.listSeparator);

export function requestChange(r: FamilyRequestView, viewer: ViewerClock): string {
  const at = (iso: string) => whenIn(new Date(iso), viewer.tz, viewer.cycle);
  return t.lessons.proposal.change
    .replace('{from}', at(r.starts_at))
    .replace('{to}', at(r.proposed_starts_at));
}

export function requestAsked(r: FamilyRequestView, viewer: ViewerClock): string {
  const tz = r.students[0]?.tz ?? viewer.tz;
  return t.lessons.proposal.familyPending.replace(
    '{when}',
    whenText(r.proposed_starts_at, tz, viewer),
  );
}

/** The lesson's length in minutes (the slot grid books the same length). */
export const requestMinutes = (r: FamilyRequestView): number =>
  Math.round((Date.parse(r.ends_at) - Date.parse(r.starts_at)) / 60_000);
