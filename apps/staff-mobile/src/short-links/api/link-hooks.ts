import {
  SHORT_LINKS_KEY,
  shortLinkQueries,
  shortLinkSends,
  type ShortLinkListFilter,
} from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';

// Short links (docs/19).

const client = { apiFetch, apiSend };
const queries = shortLinkQueries(client);
const sends = shortLinkSends(client);

/** The rows hold phones and names: kept off the disk cache. */
const meta = { noPersist: true };

/** The list rows the screen shows at once (the API's maximum page). */
const LIST_SIZE = 100;

export const useShortLinks = (filter: ShortLinkListFilter) =>
  useQuery({
    ...queries.listQuery({ ...filter, pageSize: LIST_SIZE }),
    placeholderData: keepPreviousData,
    meta,
  });

export const useShortLink = (code: string) => useQuery({ ...queries.detailQuery(code), meta });

/** GET /short-links/people: idle under PEOPLE_SEARCH_MIN characters. */
export const useLinkPeople = (search: string) =>
  useQuery({ ...queries.peopleQuery(search), placeholderData: keepPreviousData, meta });

/** A write's answer becomes the link's detail at once; every list reads again. */
function useSettle() {
  const qc = useQueryClient();
  return (link: ShortLinkDetail) => {
    qc.setQueryData(queries.detailQuery(link.code).queryKey, link);
    return qc.invalidateQueries({ queryKey: SHORT_LINKS_KEY });
  };
}

export const useCreateLink = () =>
  useMutation({ mutationFn: sends.create, onSuccess: useSettle() });

export const useUpdateLink = () =>
  useMutation({ mutationFn: sends.update, onSuccess: useSettle() });

export const useRevokeLink = () =>
  useMutation({ mutationFn: sends.revoke, onSuccess: useSettle() });

export const useResendLink = () =>
  useMutation({ mutationFn: sends.resend, onSuccess: useSettle() });
