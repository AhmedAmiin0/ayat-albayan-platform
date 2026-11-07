import { Agent, setGlobalDispatcher } from 'undici';

/**
 * docs/42 42-6: Node's fetch keeps an idle socket ~4 s, so most chat sends after a pause opened a
 * new TCP + TLS connection to Kapso. 20 s stays below the usual 60 s+ idle timeout of the servers
 * we call (a server's own Keep-Alive hint still wins when it is shorter). A socket the server
 * closes as a POST starts is the existing `uncertain` path: never resent. At most 32 sockets per
 * origin (owner 2026-11-07: memory stays bounded in a burst; a 33rd request waits for a free one).
 */
export const KEEP_ALIVE = {
  keepAliveTimeout: 20_000,
  keepAliveMaxTimeout: 60_000,
  connections: 32,
} as const;

export const keepAliveAgent = (): Agent => new Agent({ ...KEEP_ALIVE });

/** main.ts, once at boot: every outbound fetch of the process (Kapso, PostgREST) reuses sockets. */
export function installKeepAlive(): void {
  setGlobalDispatcher(keepAliveAgent());
}
