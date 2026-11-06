import {
  Controller, HttpCode, HttpException, HttpStatus, Logger, NotFoundException, Post, Req,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { EVOLUTION_INSTANCE_RE } from '@ab/shared';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { ZodParam } from '@/common/http/zod-inputs';
import { verifyEvolution } from '@/modules/messaging/webhook/parse/webhook.evolution-auth';
import { parseEvolution } from '@/modules/messaging/webhook/parse/webhook.evolution';
import { within, RESPONSE_BUDGET_MS } from '@/modules/messaging/webhook/webhook.service';
import { evolutionNumber, numbersNotLoaded, type EvolutionNumber } from './evolution-numbers';
import { EvolutionRate } from './evolution-rate';
import { EvolutionWebhookService } from './evolution-webhook.service';

/** The only header read: the instance token (never logged). */
const headersSchema = z.looseObject({ 'x-evolution-token': z.string().optional() });
type Headers = z.infer<typeof headersSchema>;

/** A name that is no instance of ours is a 404 like an unknown one (no hint which exist). */
const INSTANCE = z.string().regex(EVOLUTION_INSTANCE_RE);
const unknown = () => new NotFoundException();
/** The numbers config is not loaded yet: retryable, so no family message is lost. */
const notLoaded = () => new ServiceUnavailableException();

/**
 * Evolution API's per-instance webhook (docs/19 «Evolution driver»). Public: rate-limited, an
 * unknown instance is 404, and the instance's own token authenticates (the x-evolution-token
 * header the instance's webhook sends; constant time). Idempotent: a replayed message id
 * stores nothing new.
 */
@ApiTags('webhooks')
@Public()
@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly log = new Logger(EvolutionWebhookController.name);
  private readonly rate = new EvolutionRate();

  constructor(private readonly evolution: EvolutionWebhookService) {}

  /** 429 over budget, 404 unknown (503 before numbers load), 401 bad token, 500 failed item. */
  @Post(':instance')
  @HttpCode(200)
  async receive(
    @ZodParam('instance', INSTANCE, unknown) instance: string,
    @Req() req: { body: unknown; headers: unknown },
  ): Promise<void> {
    const now = new Date();
    const known = this.authenticated({
      number: evolutionNumber(instance),
      headers: headersSchema.parse(req.headers),
      now,
    });
    // Only an authenticated delivery counts against its instance: a flood without the token
    // can never starve the real instance's budget (it shares the unknown bucket instead).
    this.limit(instance, { known: true, now });
    const delivery = parseEvolution(req.body, { now, where: known.where, instance });
    if (!delivery || delivery.kind === 'ignored') return;
    const work = this.evolution.apply(delivery, { numberId: known.id, now });
    await within(work, RESPONSE_BUDGET_MS);
  }

  private limit(key: string, at: { known: boolean; now: Date }): void {
    if (this.rate.take(key, { known: at.known, now: at.now.getTime() })) return;
    throw new HttpException('too_many_requests', HttpStatus.TOO_MANY_REQUESTS);
  }

  /** 404 unknown, 401 bad token; both count against the shared unknown bucket (429 first). */
  private authenticated(at: { number: EvolutionNumber | null; headers: Headers; now: Date }) {
    const verdict = at.number
      ? verifyEvolution({ headers: at.headers, token: at.number.token })
      : 'unknown';
    if (verdict === 'ok' && at.number) return at.number;
    this.limit('*', { known: false, now: at.now });
    if (!at.number) throw numbersNotLoaded() ? notLoaded() : unknown();
    // Debug only, like the other webhook routes: the verdict, never a header value.
    this.log.debug(`evolution webhook refused (401): ${verdict}`);
    throw new UnauthorizedException();
  }
}
