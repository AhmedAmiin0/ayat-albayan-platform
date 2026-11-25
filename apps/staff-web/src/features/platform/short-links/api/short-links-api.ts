import { shortLinkQueries, shortLinkSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

// Managed links (docs/19): reads and writes live in @ab/client-core, bound here to the web client.

export { SHORT_LINKS_KEY } from '@ab/client-core';

const client = { apiFetch, apiSend };

export const { listQuery, detailQuery, peopleQuery } = shortLinkQueries(client);

export const linkSends = shortLinkSends(client);
