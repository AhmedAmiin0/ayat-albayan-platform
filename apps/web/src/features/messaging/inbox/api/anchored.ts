import { anchoredThreadPages, anchoredThreadPrefix } from '@ab/client-core';
import { infiniteQueryOptions, type QueryClient } from '@tanstack/react-query';
import { threadPage } from './api';

/**
 * The window around a search hit (docs/37 NEW 3): ?around=<id>, then older pages inside it.
 * Static: no poll, no focus refetch (the live chat stays mounted for those), no retry (a 404 says
 * the hit is gone), and dropped a minute after the reader leaves it.
 */
export const anchoredThreadQuery = (phone: string, id: string) =>
  infiniteQueryOptions({
    ...anchoredThreadPages(phone, id, threadPage),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 60_000,
  });

/**
 * A bubble action's answer also reaches the chat's anchored windows (docs/37 review 1): they sit
 * outside the live key on purpose, so a hide, a reaction or a retry inside one re-reads it too.
 */
export const refreshAnchored = (client: QueryClient, phone: string) =>
  client.invalidateQueries({ queryKey: anchoredThreadPrefix(phone) });
