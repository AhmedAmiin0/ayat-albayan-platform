import { subscribe } from 'node:diagnostics_channel';

// docs/42 42-2: how many new TCP (+ TLS) connections the outbound fetch opened (a measurement only;
// keep-alive 42-6 is postponed, owner 2026-11-07). Node's fetch publishes one
// `undici:client:connected` per new socket.

export const CONNECTED_CHANNEL = 'undici:client:connected';

const opened = { count: 0 };

subscribe(CONNECTED_CHANNEL, () => {
  opened.count += 1;
});

/** New connections since this process started; the difference around a call = its new ones. */
export const connectionsOpened = (): number => opened.count;
