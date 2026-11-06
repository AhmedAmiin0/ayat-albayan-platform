import {
  evolutionConfigOf, type EvolutionConfig, type EvolutionSyncView, type NumberSecretName,
} from '@ab/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { loadEnv, type Env, type EvolutionLineEnv } from '@/config/env/env';
import { evolutionBaseOf } from '@/config/env/whatsapp/env.evolution';
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

/** What the push needs besides the instance env: options, global key, proxy password. */
export interface EvolutionPushInput {
  env: EvolutionLineEnv;
  config: EvolutionConfig;
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
    if (!(await this.evolution.saveConfig(id, config))) throw conflict('not_evolution');
    const entry = { actorId, entity: 'wa_numbers', entityId: id, action: 'evolution_config' };
    await this.effects.after({ ...entry, after: { evolution_config: config } });
  }

  saveSync(id: string, view: EvolutionSyncView): Promise<void> {
    return this.evolution.saveSync(id, view);
  }

  /**
   * WhatsApp restricted the number (a late 463 / 475): switched off, its queued rows failed so
   * staff resend them elsewhere. true = switched off now (the bell rings once).
   */
  async restrict(id: string, now: Date): Promise<boolean> {
    if (!(await this.evolution.restrict(id, now))) return false;
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
    const line = evolutionLineEnv(row, { base, token, mode });
    return inputOf(row, { env: line, global: env, secrets });
  }
}

/** The push input of a configured row (the proxy password and the global key may be absent). */
function inputOf(
  row: NumberRow,
  at: { env: EvolutionLineEnv; global: Env; secrets: Partial<Record<NumberSecretName, string>> },
): EvolutionPushInput {
  return {
    env: at.env,
    config: evolutionConfigOf(row.evolution_config),
    globalKey: at.global.EVOLUTION_API_KEY ?? null,
    proxyPassword: at.secrets.evolution_proxy_password ?? null,
  };
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
