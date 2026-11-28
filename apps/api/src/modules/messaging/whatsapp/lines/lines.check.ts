import type { LineCheckView } from '@ab/shared';
import { WA_LINES, type WaLine } from '@ab/catalog';
import { Injectable } from '@nestjs/common';
import { isGraphEnv, lineEnvs, loadEnv, type WhatsappEnv } from '@/config/env/env';
import type { FetchLike, GraphConn } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { offGraphCheck } from './lines.check.evolution';
import { driverOf, type LineDriver } from './lines.check.driver';
import { appsOf, graphCheck, unconfigured } from './lines.check.graph';
import { withMetaReady } from './lines.check.meta';

export { PHONE_FIELDS } from './lines.check.graph';

interface LineInput {
  line: WaLine;
  env: WhatsappEnv | null;
  appId: string | null;
  checkedAt: string;
  /** The line's driver, the NAMES of what it still lacks, a duplicate chat id (docs/19). */
  driver: LineDriver;
}

/**
 * POST /messaging/lines/check (docs/12 §13.9): two read-only Graph GETs per configured line, both
 * lines and both calls at once, through each line's driver (a crm line: GET /me only,
 * lines.check.crm.ts). Ids, URLs and key NAMES only: the result never carries a token, key or
 * secret.
 */
@Injectable()
export class LinesCheck {
  /** Tests set it; absent, each driver calls through the runtime http client. */
  fetch?: FetchLike;
  timeoutMs = 8000;

  async check(): Promise<LineCheckView[]> {
    const env = loadEnv();
    const envs = lineEnvs(env);
    const checkedAt = new Date().toISOString();
    const appIds: Record<WaLine, string | undefined> = {
      notifications: env.WA_APP_ID,
      chat: env.WA_CHAT_APP_ID,
    };
    const ctx = { env, fetch: this.fetch, timeoutMs: this.timeoutMs, apps: appsOf };
    return Promise.all(
      WA_LINES.map(async (line) => {
        const driver = driverOf(env, line);
        const appId = driver.provider === 'meta' ? (appIds[line] ?? null) : null;
        const view = await this.one({ line, env: envs[line], appId, checkedAt, driver });
        return withMetaReady(view, { ...ctx, line });
      }),
    );
  }

  private async one(input: LineInput): Promise<LineCheckView> {
    const { line, env, checkedAt } = input;
    if (!env) return { ...unconfigured(line, checkedAt), ...input.driver };
    // crm (GET /me) and evolution (connectionState): no Graph call at all (docs/19).
    if (!isGraphEnv(env)) return offGraphCheck({ ...input, env, at: this });
    const conn: GraphConn = { env, fetch: this.fetch, timeoutMs: this.timeoutMs };
    return graphCheck({ ...input, env }, conn);
  }
}
