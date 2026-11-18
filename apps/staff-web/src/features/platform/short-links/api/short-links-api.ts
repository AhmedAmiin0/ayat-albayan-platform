import { shortLinkQueries, shortLinkSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// «الروابط المختصرة» (docs/19 «Managed links»): the reads and writes live in @ab/client-core, the
// same as the phone's; this module binds them to the web's API client.

export { SHORT_LINKS_KEY } from '@ab/client-core';

const client = { apiFetch, apiSend };

export const { listQuery, detailQuery, peopleQuery } = shortLinkQueries(client);

export const linkSends = shortLinkSends(client);
