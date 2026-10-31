import type { AuthUser } from '@/common/auth/verify-token';
import { entityOf, fieldNames, responseId } from './activity.route';
import type { ActivityInsert } from './activity.writer';

/** The parts of the Fastify request the activity log reads (headers: user-agent only). */
export interface ActivityRequest {
  method: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  params?: unknown;
  body?: unknown;
  user?: AuthUser;
  /** Fastify's matched route PATTERN ('/students/:id'), never the raw URL. */
  routeOptions?: { url?: string };
}

export interface EntryInput {
  req: ActivityRequest;
  route: string;
  action: string;
  status: number;
  durationMs: number;
  /** The handler's response (only its `id` is read, for creates). */
  response?: unknown;
}

const UA_MAX = 200;
const IP = /^[0-9A-Fa-f:.]{2,45}$/;
const TOO_MANY = 429;

function userAgent(req: ActivityRequest): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' && ua !== '' ? ua.slice(0, UA_MAX) : null;
}

/** The actor's role: their profile role, 'public' without a login, 'unknown' without a profile. */
function role(user: AuthUser | undefined): string {
  if (!user) return 'public';
  return user.role ?? 'unknown';
}

const clientIp = (ip: string | undefined): string | null => (ip && IP.test(ip) ? ip : null);

/**
 * One activity_log row, or null when not worth a row: a throttled (429) call without a login, so a
 * flood against a public endpoint cannot flood the log. Body values never leave this function:
 * only the top-level field names (meta.fields) and a created row's `id`.
 */
export function toEntry(input: EntryInput): ActivityInsert | null {
  const { req, route, status } = input;
  const method = req.method.toUpperCase();
  if (!req.user && status === TOO_MANY) return null;
  const ref = entityOf(route, req.params);
  const created = method === 'POST' && status < 400 ? responseId(input.response) : null;
  const fields = method === 'DELETE' ? [] : fieldNames(req.body);
  return {
    actor_id: req.user?.id ?? null,
    actor_role: role(req.user),
    action: input.action,
    method,
    route: route.slice(0, 200),
    entity: ref.entity?.slice(0, 60) ?? null,
    entity_id: ref.entityId ?? created,
    status,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    ip: clientIp(req.ip),
    user_agent: userAgent(req),
    meta: fields.length > 0 ? { fields } : {},
  };
}
