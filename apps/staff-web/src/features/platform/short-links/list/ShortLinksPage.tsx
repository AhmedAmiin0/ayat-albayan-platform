import { ownerChoices } from '@ab/client-core';
import type { ShortLinkPage } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { useLinkList, useStatusCounts } from '@/features/platform/short-links/api/use-short-links';
import { CreateLinkDialog } from '@/features/platform/short-links/create/CreateLinkDialog';
import {
  filterOf, isFiltered, LINK_ROUTES, LIST_PAGE_SIZE, type LinkListSearch, type LinkSection,
} from '@/features/platform/short-links/shared/link-routes';
import { ListBody } from './ListBody';
import { ListFilters } from './ListFilters';
import { ListHead } from './ListHead';
import { ListPager } from './ListPager';

/** The owner filter's people (everyone on the page), for short_links.all only. */
const ownersOf = (page: ShortLinkPage | undefined, showOwner: boolean) =>
  showOwner ? ownerChoices(page?.rows ?? []) : null;

export interface ShortLinksPageProps {
  section: LinkSection;
  /** Status, owner, search and page, kept in the route's search. */
  search: LinkListSearch;
  onSearch: (next: LinkListSearch) => void;
}

/** Own links, or every link with an owner column and filter for short_links.all. */
export function ShortLinksPage({ section, search, onSearch }: ShortLinksPageProps) {
  const showOwner = usePermissions().can('short_links.all');
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const list = useLinkList(filterOf(search));
  const counts = useStatusCounts(filterOf({ ...search, status: undefined, page: undefined }));
  const open = (code: string) =>
    void navigate({ to: LINK_ROUTES[section].detail, params: { code } });
  return (
    <>
      <ListHead total={list.data?.total} onNew={() => setCreating(true)} />
      <div className="grid gap-5">
        <ListFilters
          search={search}
          onSearch={onSearch}
          counts={counts}
          owners={ownersOf(list.data, showOwner)}
        />
        <ListBody
          section={section}
          showOwner={showOwner}
          list={list}
          filtered={isFiltered(search)}
          onNew={() => setCreating(true)}
          onClear={() => onSearch({})}
        />
        <ListPager
          page={search.page}
          pageSize={LIST_PAGE_SIZE}
          total={list.data?.total}
          onPage={(page) => onSearch({ ...search, page })}
        />
      </div>
      {creating && <CreateLinkDialog onClose={() => setCreating(false)} onCreated={open} />}
    </>
  );
}
