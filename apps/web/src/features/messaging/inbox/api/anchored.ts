import { anchoredThreadPages, anchoredThreadPrefix, ApiError } from '@ab/client-core';
import { infiniteQueryOptions, type QueryClient } from '@tanstack/react-query';
import { threadPage } from './api';

/**
 * The window around a search hit (docs/37 NEW 3): ?around=<id>, then older pages inside it.
 * Static: no poll, no focus refetch (the live chat stays mounted for those); a 404 (the hit is
 * gone) is final, any other failure is retried twice; dropped a minute after the reader leaves it.
 */
/** The API's 404 message_not_found: the hit is not in this chat any more. */
export const hitGone = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404;

export const anchoredThreadQuery = (phone: string, id: string) =>
  infiniteQueryOptions({
    ...anchoredThreadPages(phone, id, threadPage),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failures: number, error: Error) => !hitGone(error) && failures < 2,
    gcTime: 60_000,
  });

/**
 * A bubble action's answer also reaches the chat's anchored windows (docs/37 review 1): they sit
 * outside the live key on purpose, so a hide, a reaction or a retry inside one re-reads it too.
 */
export const refreshAnchored = (client: QueryClient, phone: string) =>
  client.invalidateQueries({ queryKey: anchoredThreadPrefix(phone) });
