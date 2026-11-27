import { z } from 'zod';
import { isRead } from '../timeouts';
import type { ApiClient, Requester } from '../api-client';
import type { Ask, AskRequest } from './call.types';

const requesterShape = z.object({ request: z.instanceof(Function) });

const isRequester = (api: ApiClient | Requester): api is Requester =>
  requesterShape.safeParse(api).success;

const sendMethod = z.enum(['POST', 'PUT', 'PATCH', 'DELETE']);

/** apiFetch(path) alone when there is no init, as a hand-written read made it. */
function readFrom(api: ApiClient, { path, signal, headers }: AskRequest): Promise<unknown> {
  const init = { ...(signal ? { signal } : {}), ...(headers ? { headers } : {}) };
  return Object.keys(init).length === 0 ? api.apiFetch(path) : api.apiFetch(path, init);
}

// docs/62 part 3 §3b F deletes it with the pair: an injected `{ apiFetch, apiSend }` still answers
// through the functions a test mocks, and apiSend takes no signal or headers.
function askPair(api: ApiClient): Ask {
  return (request: AskRequest) =>
    isRead({ method: request.method })
      ? readFrom(api, request)
      : api.apiSend(sendMethod.parse(request.method), request.path, request.body);
}

/** How call() asks one api client: its one request, or the pair on a client that lacks it. */
export const askVia = (api: ApiClient | Requester): Ask =>
  isRequester(api) ? (request) => api.request(request) : askPair(api);
