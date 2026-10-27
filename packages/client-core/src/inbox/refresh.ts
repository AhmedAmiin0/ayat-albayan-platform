// The WhatsApp inbox's refresh cadence (owner 2026-10-27 «the API gets slowed»), shared by web and mobile.

/** The open chat's delta poll (GET /threads/:phone?after=, ~2 reads) while it is on screen. */
export const THREAD_DELTA_MS = 10_000;
/** A full re-read of the open chat's newest page (people, lessons, ticks of older rows) while on screen. */
export const THREAD_FULL_MS = 60_000;
/** The chats list (one row per phone from thread_summaries, migration 20261028000850). */
export const CHATS_LIST_MS = 15_000;
