import { EVOLUTION_MODES, type EvolutionMode } from '@ab/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { loadEnv, type EvolutionLineEnv } from '@/config/env/env';
import { evolutionBaseOf } from '@/config/env/whatsapp/env.evolution';
import { NumbersSecrets } from '@/modules/messaging/numbers/config/numbers.secrets';
import { NumbersRepo, type NumberRow } from '@/modules/messaging/numbers/numbers.repo';

// An Evolution number's instance for the admin's two read calls (docs/19 «Evolution driver»):
// «افحص الاتصال» and the QR panel. Enabled or not (the QR links a number before it sends). The
// key is the number's own token, else the server's global key. Never returned to a client.

const conflict = (code: string) => new ConflictException({ code, message: code });

/** An Evolution row's engine; 409 not_evolution for any other provider. */
function modeOf(row: NumberRow): EvolutionMode {
  const mode = EVOLUTION_MODES.find((m) => m === row.evolution_mode);
  if (row.provider !== 'evolution' || !mode) throw conflict('not_evolution');
  return mode;
}

@Injectable()
export class NumbersEvolution {
  constructor(
    private readonly repo: NumbersRepo,
    private readonly secrets: NumbersSecrets,
  ) {}

  /** 404 unknown, 409 not_evolution / evolution_not_configured. Holds a secret: never log. */
  async instanceEnv(id: string): Promise<EvolutionLineEnv> {
    const row = await this.repo.byId(id);
    if (!row) throw new NotFoundException();
    const mode = modeOf(row);
    const env = loadEnv();
    const base = evolutionBaseOf(env.EVOLUTION_API_BASE);
    const token = (await this.secrets.read(id)).evolution_token ?? env.EVOLUTION_API_KEY;
    if (!base || !token) throw conflict('evolution_not_configured');
    const autoSends = row.evolution_auto_sends;
    const gapMs = env.EVOLUTION_SEND_GAP_MS;
    return { provider: 'evolution', base, instance: row.phone_number_id, token, mode, autoSends, gapMs };
  }
}
