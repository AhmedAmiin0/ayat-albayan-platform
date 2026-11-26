import type { FetchLike } from '@/common/infra/http/failure';

const textOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The CRM transport, keeping the text of the error it throws: the CRM's «request failed» message
 * carries it (line checks and chat views show it). It stays out of the shared http failure, which
 * never carries a transport text since some name the URL.
 */
export function recordingFetch(fetch: FetchLike) {
  const seen = { cause: 'fetch failed' };
  const recorded: FetchLike = async (url, init) => {
    try {
      return await fetch(url, init);
    } catch (e) {
      seen.cause = textOf(e);
      throw e;
    }
  };
  return { fetch: recorded, seen };
}
