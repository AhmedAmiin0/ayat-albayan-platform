import { z } from 'zod';

// The API posts to a browser's push endpoint, so only the browser push services are accepted:
// https on the default port, by host name, without userinfo. Checked at subscribe and before
// every send, since a stored row could predate a tighter list.
const EXACT_HOSTS = /fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com/.source;
const SUFFIXES = /push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com/.source;
const PUSH_HOST = new RegExp(`^(?:${EXACT_HOSTS}|.+\\.(?:${SUFFIXES}))$`);

/** The normalised href holds a port or userinfo only behind a `:` or `@` before the path. */
const pushUrlSchema = z
  .url({ protocol: /^https$/, hostname: PUSH_HOST, normalize: true })
  .regex(/^https:\/\/[^/:@]+\//);

/** zod trims spaces beyond ASCII that the URL parser keeps, so such padding is refused. */
const WIDE_SPACE_EDGE = /^\s*(?=\s)\P{ASCII}|(?=\s)\P{ASCII}\s*$/u;

const paddedBeyondAscii = (endpoint: string) => WIDE_SPACE_EDGE.test(endpoint);

/** True when `endpoint` is an https URL of an allowed browser push service. */
export const pushEndpointAllowed = (endpoint: string): boolean =>
  !paddedBeyondAscii(endpoint) && pushUrlSchema.safeParse(endpoint).success;
