import {
  LINK_STATUS_TABS, linkStatusOf, type LinkStatusTab, type ShortLinkListFilter,
} from '@ab/client-core';
import {
  keepPreviousData, useMutation, useQueries, useQuery, useQueryClient,
} from '@tanstack/react-query';
import { useDeferredValue } from 'react';
import { detailQuery, linkSends, listQuery, peopleQuery, SHORT_LINKS_KEY } from './short-links-api';

// The hooks the short-link screens call: one page of the list, the status counts of the chips,
// a link, the people picker, and the writes (each one reads every list and detail again).

export const useLinkList = (filter: ShortLinkListFilter) =>
  useQuery({ ...listQuery(filter), placeholderData: keepPreviousData });

/** Each chip's count under the other filters (one row per read: only `total` is used). */
export function useStatusCounts(
  filter: ShortLinkListFilter,
): Partial<Record<LinkStatusTab, number>> {
  const reads = useQueries({
    queries: LINK_STATUS_TABS.map((tab) =>
      listQuery({ ...filter, ...linkStatusOf(tab), page: 1, pageSize: 1 }),
    ),
  });
  return Object.fromEntries(LINK_STATUS_TABS.map((tab, i) => [tab, reads[i]?.data?.total]));
}

export const useLinkDetail = (code: string) => useQuery(detailQuery(code));

/** The picker's matches: the search settles before it is sent (typing stays smooth). */
export function usePeopleSearch(search: string) {
  const settled = useDeferredValue(search);
  return useQuery(peopleQuery(settled));
}

function useLinkWrite<I, O>(write: (input: I) => Promise<O>, onDone: (out: O) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: async (out) => {
      await queryClient.invalidateQueries({ queryKey: SHORT_LINKS_KEY });
      onDone(out);
    },
  });
}

type Done<K extends keyof typeof linkSends> = (
  out: Awaited<ReturnType<(typeof linkSends)[K]>>,
) => void;

export const useCreateLink = (onDone: Done<'create'>) => useLinkWrite(linkSends.create, onDone);
export const useUpdateLink = (onDone: Done<'update'>) => useLinkWrite(linkSends.update, onDone);
export const useRevokeLink = (onDone: Done<'revoke'>) => useLinkWrite(linkSends.revoke, onDone);
export const useResendLink = (onDone: Done<'resend'>) => useLinkWrite(linkSends.resend, onDone);
