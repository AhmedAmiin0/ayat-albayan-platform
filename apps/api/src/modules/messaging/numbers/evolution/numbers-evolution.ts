import {
  EVOLUTION_ERROR_WINDOW_MS, evolutionConfigOf, type EvolutionConfig, type EvolutionSyncView,
  type NumberSecretName,
} from '@ab/shared';
import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { loadEnv, type Env, type EvolutionLineEnv } from '@/config/env/env';
import { evolutionBaseOf, evolutionHookOf } from '@/config/env/whatsapp/env.evolution';
import {
  evolutionLineEnv, evolutionModeOf, instanceToken,
} from '@/modules/messaging/numbers/config/numbers.env.evolution';
import { NumbersSecrets } from '@/modules/messaging/numbers/config/numbers.secrets';
import { NumbersEffects } from '@/modules/messaging/numbers/numbers.effects';
import { NumbersRepo, type NumberRow } from '@/modules/messaging/numbers/numbers.repo';
import { EvolutionNumbersRepo } from './evolution-numbers.repo';

// An Evolution number for the admin (docs/19 «Evolution driver»): its instance for «افحص
// الاتصال» / QR, its options saved and pushed (owner 2026-11-06), and the restriction switch-off.
// Every value returned here holds a secret: used server-side only, never logged or returned.

const conflict = (code: string) => new ConflictException({ code, message: code });
const bad = (code: string) => new BadRequestException({ code, message: code });

/** A Cloud instance is created with Meta's ids: both are needed (else Evolution refuses it). */
const cloudIdsMissing = (mode: string | null, c: EvolutionConfig): boolean =>
  mode === 'cloud' && (c.cloud.phone_number_id === null || c.cloud.business_id === null);

/** A webhook that is on but whose origin is not configured (public without API_PUBLIC_URL). */
const hookUnbuildable = (c: EvolutionConfig, instance: string): boolean =>
  c.webhook.enabled && evolutionHookOf(c, instance) === null;

/** What the push needs besides the instance env: options, hook URL, global key, proxy password. */
interface EvolutionPushInput {
  env: EvolutionLineEnv;
  config: EvolutionConfig;
  hookUrl: string | null;
  globalKey: string | null;
  proxyPassword: string | null;
}

@Injectable()
export class NumbersEvolution {
  constructor(
    private readonly repo: NumbersRepo,
    private readonly secrets: NumbersSecrets,
    private readonly evolution: EvolutionNumbersRepo,
    private readonly effects: NumbersEffects,
  ) {}

  /** 404 unknown, 409 not_evolution / evolution_not_configured. Key: its own, else the global. */
  async instanceEnv(id: string): Promise<EvolutionLineEnv> {
    return (await this.target(id, { needOwnKey: false })).env;
  }

  /** The push: the number's OWN key is needed (the instance is created with it). */
  pushInput(id: string): Promise<EvolutionPushInput> {
    return this.target(id, { needOwnKey: true });
  }

  /** Saves the options (zod-checked by the controller), audited; the line config reloads. */
  async saveConfig(input: { id: string; config: EvolutionConfig; actorId: string }): Promise<void> {
    const { id, config, actorId } = input;
    const row = (await this.repo.byId(id)) ?? notFound();
    // The URL is the server's: a public origin needs API_PUBLIC_URL (https) to be set.
    if (hookUnbuildable(config, row.phone_number_id)) throw bad('webhook_origin');
    if (cloudIdsMissing(row.evolution_mode, config)) throw bad('cloud_ids_needed');
    if (!(await this.evolution.saveConfig(id, config))) throw conflict('not_evolution');
    const entry = { actorId, entity: 'wa_numbers', entityId: id, action: 'evolution_config' };
    await this.effects.after({ ...entry, after: { evolution_config: config } });
  }

  saveSync(id: string, view: EvolutionSyncView): Promise<void> {
    return this.evolution.saveSync(id, view);
  }

  /**
   * WhatsApp ERRORs on our sends (review fix 3): `limits.error_trip` of them (default 3) within
   * 15 min, none from before the admin's last enable, switch the number off. true = off now.
   */
  async tripOnErrors(id: string, at: { now: Date; sentAt: string }): Promise<boolean> {
    const w = await this.evolution.errorWindow(id);
    if (!w) return false;
    const since = Math.max(at.now.getTime() - EVOLUTION_ERROR_WINDOW_MS, Date.parse(w.enabledAt));
    const errors = await this.evolution.countErrors(id, new Date(since));
    if (errors < w.trip) return false;
    return this.restrict(id, at);
  }

  /**
   * Switched off: no longer default, state refused, its queued rows failed so staff resend them
   * elsewhere. true = switched off now (the bell rings once).
   */
  private async restrict(id: string, at: { now: Date; sentAt: string }): Promise<boolean> {
    if (!(await this.evolution.restrict(id, at))) return false;
    await this.evolution.failQueued(id);
    const entry = { actorId: null, entity: 'wa_numbers', entityId: id, action: 'evolution_restricted' };
    await this.effects.after({ ...entry, after: { enabled: false, evolution_state: 'refused' } });
    return true;
  }

  private async target(id: string, at: { needOwnKey: boolean }): Promise<EvolutionPushInput> {
    const row = (await this.repo.byId(id)) ?? notFound();
    const mode = modeOf(row);
    const env = loadEnv();
    const secrets = await this.secrets.read(id);
    const own = instanceToken(mode, secrets);
    const token = at.needOwnKey ? own : (own ?? env.EVOLUTION_API_KEY);
    const base = evolutionBaseOf(env);
    if (!base || !token) throw conflict('evolution_not_configured');
    cloudIdsNeeded(row);
    const line = evolutionLineEnv(row, { base, token, mode });
    return inputOf(row, { env: line, global: env, secrets });
  }
}

/** The push input of a configured row (the proxy password and the global key may be absent). */
function inputOf(
  row: NumberRow,
  at: { env: EvolutionLineEnv; global: Env; secrets: Partial<Record<NumberSecretName, string>> },
): EvolutionPushInput {
  const config = evolutionConfigOf(row.evolution_config);
  return {
    env: at.env,
    config,
    // Rebuilt from the CURRENT instance name on every push (a rename never pushes the old URL).
    hookUrl: evolutionHookOf(config, row.phone_number_id),
    globalKey: at.global.EVOLUTION_API_KEY ?? null,
    proxyPassword: at.secrets.evolution_proxy_password ?? null,
  };
}

/** 409 evolution_cloud_ids: a Cloud instance cannot be created without Meta's ids. */
function cloudIdsNeeded(row: NumberRow): void {
  if (cloudIdsMissing(row.evolution_mode, evolutionConfigOf(row.evolution_config))) {
    throw conflict('evolution_cloud_ids');
  }
}

const notFound = (): never => {
  throw new NotFoundException();
};

/** An Evolution row's engine; 409 not_evolution for any other provider. */
function modeOf(row: NumberRow) {
  const mode = row.provider === 'evolution' ? evolutionModeOf(row) : undefined;
  if (!mode) throw conflict('not_evolution');
  return mode;
}
