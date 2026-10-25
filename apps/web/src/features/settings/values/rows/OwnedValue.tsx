import { Link } from '@tanstack/react-router';
import { OWNER_PAGE } from '../lib/value-groups-view';
import type { OwnedValueGroupId } from '@ab/shared';

/** A module-owned value: text, and the link to the page that edits it (never an editor). */
export function OwnedValue({ text, group }: { text: string; group: OwnedValueGroupId }) {
  const page = OWNER_PAGE[group];
  return (
    <span className="grid gap-0.5">
      <span className="text-sm text-ink">{text}</span>
      <Link to={page.to} search={page.search} className="text-xs font-semibold text-lapis underline underline-offset-4">
        {page.label}
      </Link>
    </span>
  );
}
