import type { LineCheckView, WaLine, WaProvider } from '@ab/shared';
import type { Env, MetaLineEnv } from '@/config/env/env';
import { chatEnv, metaNotifications } from '@/config/env/whatsapp/env.meta';
import type { FetchLike, GraphConn } from '@/modules/messaging/whatsapp/drivers/meta/graph';

// «افحص الخطوط» for the switch to Meta (docs/19 «CRM → Meta»): the app secret and the verify token
// set (booleans, never values) and the line's app subscribed to its WABA. A meta line reads it
// from its own check; a crm line asks Meta once with the ids it would switch to (a read-only GET).

type Apps = NonNullable<LineCheckView['subscribed_apps']>;
type MetaReady = NonNullable<LineCheckView['meta_ready']>;

export interface ReadyContext {
  env: Env;
  line: WaLine;
  fetch: FetchLike;
  timeoutMs: number;
  /** GET /{waba}/subscribed_apps (lines.check.ts appsOf). */
  apps: (conn: GraphConn) => Promise<Apps>;
}

/** The line's app among the WABA's subscribed apps; no app id: any app; null = not known. */
export function appSubscribed(apps: Apps | null, appId: string | null): boolean | null {
  if (apps === null) return null;
  return appId === null ? apps.length > 0 : apps.some((a) => a.id === appId);
}

const SECRET: Record<WaLine, (env: Env) => string | undefined> = {
  notifications: (env) => env.WA_APP_SECRET,
  chat: (env) => env.WA_CHAT_APP_SECRET,
};

const METAS: Record<WaLine, (env: Env, base: string | undefined) => MetaLineEnv | null> = {
  notifications: metaNotifications,
  chat: chatEnv,
};

function ready(ctx: ReadyContext, app_subscribed: boolean | null): MetaReady {
  const app_secret = SECRET[ctx.line](ctx.env) !== undefined;
  return { app_secret, verify_token: ctx.env.WA_VERIFY_TOKEN !== undefined, app_subscribed };
}

/** A crm line's Meta ids (WA_* beside the CRM's): its app subscribed; null = unset / failed. */
async function preflight(ctx: ReadyContext): Promise<boolean | null> {
  const env = METAS[ctx.line](ctx.env, ctx.env.WA_API_BASE?.replace(/\/+$/, ''));
  if (!env) return null;
  const conn: GraphConn = { env, fetch: ctx.fetch, timeoutMs: ctx.timeoutMs };
  const apps = await ctx.apps(conn).catch(() => null);
  return appSubscribed(apps, env.appId ?? null);
}

type WithReady = (view: LineCheckView, ctx: ReadyContext) => Promise<LineCheckView>;

const onMeta: WithReady = (view, ctx) => {
  const subscribed = appSubscribed(view.subscribed_apps, view.app_id);
  return Promise.resolve({ ...view, meta_ready: ready(ctx, subscribed) });
};

/** Per driver: a kapso line has no Meta app of ours (its inbound is Kapso's): nothing added. */
const READY: Record<WaProvider, WithReady> = {
  meta: onMeta,
  crm: async (view, ctx) => ({ ...view, meta_ready: ready(ctx, await preflight(ctx)) }),
  kapso: (view) => Promise.resolve(view),
};

/** An unconfigured line shows nothing more (every field null). */
export const withMetaReady: WithReady = async (view, ctx) =>
  view.configured ? READY[view.provider](view, ctx) : view;
