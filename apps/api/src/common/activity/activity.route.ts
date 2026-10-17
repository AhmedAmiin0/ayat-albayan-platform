// Pure helpers of the activity log: what is logged, and how a request becomes a stable action key,
// route pattern and entity. Nothing here reads a raw URL, a query string or a body value.

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Never logged, whatever the method: liveness probes and the provider webhooks (high volume,
 * machine traffic, not user actions; each keeps its own store of what it received).
 */
export const SKIPPED_ROUTES = ['/health', '/webhooks/whatsapp', '/webhooks/kapso', '/livekit/webhook'] as const;

/** Mutations only (GET/HEAD/OPTIONS are reads), minus SKIPPED_ROUTES and anything under them. */
export function shouldLog(req: { method: string; route: string }): boolean {
  if (!LOGGED_METHODS.has(req.method.toUpperCase())) return false;
  return !SKIPPED_ROUTES.some((r) => req.route === r || req.route.startsWith(`${r}/`));
}

/** `@Controller('lessons/:id')` + `@Post('cancel')` → '/lessons/:id/cancel'. */
export function joinRoute(controllerPath: string, handlerPath: string): string {
  const parts = [controllerPath, handlerPath].flatMap((p) => p.split('/')).filter((p) => p !== '');
  return `/${parts.join('/')}`;
}

/** `ExpensesController` + `create` → 'expenses.create'; `AuthSessionController` → 'authSession.…'. */
export function actionKey(controllerName: string, handlerName: string): string {
  const base = controllerName.replace(/Controller$/, '') || 'app';
  return `${base.charAt(0).toLowerCase()}${base.slice(1)}.${handlerName}`;
}

/** Only id-like params name an entity: `:id`, `:teacherId`, … — never `:token`, `:phone`, `:key`. */
const ID_PARAM = /^:(id|[a-z][A-Za-z]*Id)$/;
const MAX_ID = 64;

/** 'teacherId' → 'teachers', 'timeOffId' → 'time-offs'. */
function entityOfParam(name: string): string {
  const base = name.slice(0, -2).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return `${base}s`;
}

export interface EntityRef {
  entity: string | null;
  entityId: string | null;
}

function paramValue(params: unknown, name: string): string | null {
  if (params === null || typeof params !== 'object') return null;
  const value: unknown = Reflect.get(params, name);
  return typeof value === 'string' && value !== '' && value.length <= MAX_ID ? value : null;
}

/**
 * The entity a request acts on, from the route pattern: the segment before the first `:id`
 * ('/students/:id/join-link' → students), else the entity of a `:fooId` param, else the first
 * static segment ('/expenses' → expenses; the 'public/' prefix is skipped).
 */
export function entityOf(route: string, params: unknown): EntityRef {
  const segs = route.split('/').filter((s) => s !== '');
  const at = segs.indexOf(':id');
  const idAt = at > 0 ? at : segs.findIndex((s) => ID_PARAM.test(s));
  if (idAt >= 0) {
    const name = segs[idAt]?.slice(1) ?? '';
    const before = segs[idAt - 1];
    const plain = before && !before.startsWith(':') ? before : null;
    const entity = name === 'id' ? plain : entityOfParam(name);
    return { entity, entityId: paramValue(params, name) };
  }
  const first = segs.find((s) => !s.startsWith(':') && s !== 'public');
  return { entity: first ?? null, entityId: null };
}

const FIELD = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const MAX_FIELDS = 30;

/** Top-level field NAMES of a JSON body (never values); map-like keys (ids, phones) are dropped. */
export function fieldNames(body: unknown): string[] {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.keys(body).filter((k) => FIELD.test(k)).slice(0, MAX_FIELDS);
}

/** The `id` of a created row in the response (POST /expenses → the new expense), if any. */
export function responseId(body: unknown): string | null {
  return paramValue(body, 'id');
}

/** HTTP status class of the activity filter. */
export const isErrorStatus = (status: number): boolean => status >= 400;
