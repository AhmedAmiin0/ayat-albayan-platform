import { SHORT_LINK_STATUSES, type ShortLinkRow, type ShortLinkStatus } from '@ab/shared';
import type { ShortLinkListFilter } from '../short-links-api';

// The list's filters both apps show (boards LinkXWebList, LinkXStaffList): the status chips,
// the owner (short_links.all) and the search, as the API's query.

export const LINK_STATUS_TABS = ['all', ...SHORT_LINK_STATUSES] as const;
export type LinkStatusTab = (typeof LINK_STATUS_TABS)[number];

export const linkStatusOf = (tab: LinkStatusTab): { status?: ShortLinkStatus } =>
  tab === 'all' ? {} : { status: tab };

export interface LinkListView {
  tab?: LinkStatusTab | undefined;
  /** An owner's profile id. */
  owner?: string | undefined;
  /** As typed: trimmed, and blank is no search. */
  search?: string | undefined;
}

/** The API's filter (no page): only what is set, the search trimmed. */
export function listFilterOf(view: LinkListView): ShortLinkListFilter {
  const search = view.search?.trim();
  return {
    ...linkStatusOf(view.tab ?? 'all'),
    ...(view.owner ? { owner: view.owner } : {}),
    ...(search ? { search } : {}),
  };
}

export const isListFiltered = (view: LinkListView): boolean =>
  Object.keys(listFilterOf(view)).length > 0;

/** `all`, `mine`, or an owner's profile id. */
export type OwnerPick = string;

const OWNER_OF: Readonly<Record<string, (me: string) => string | undefined>> = {
  all: () => undefined,
  mine: (me) => me || undefined,
};

/** The owner a chip filters on (`me`: the viewer's id, '' while unknown). */
export const ownerIdOf = (pick: OwnerPick, me: string): string | undefined =>
  (OWNER_OF[pick] ?? (() => pick))(me);

export interface LinkOwner {
  id: string;
  name: string;
}

/** The owners the filter offers: everyone on the loaded rows, each once, in their order. */
export function ownerChoices(rows: readonly Pick<ShortLinkRow, 'createdBy'>[]): LinkOwner[] {
  const byId = new Map(rows.flatMap(({ createdBy: o }) => (o ? [[o.id, o.name] as const] : [])));
  return [...byId].map(([id, name]) => ({ id, name }));
}
