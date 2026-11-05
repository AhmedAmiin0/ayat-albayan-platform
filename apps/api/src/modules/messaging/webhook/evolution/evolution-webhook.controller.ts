import {
  Controller, HttpCode, HttpException, HttpStatus, Logger, NotFoundException, Post, Req,
  UnauthorizedException,
} from '@nestjs/common';
import { EVOLUTION_INSTANCE_RE } from '@ab/shared';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { ZodParam } from '@/common/http/zod-inputs';
import { verifyEvolution } from '@/modules/messaging/webhook/parse/webhook.evolution-auth';
import { parseEvolution } from '@/modules/messaging/webhook/parse/webhook.evolution';
import { within, RESPONSE_BUDGET_MS } from '@/modules/messaging/webhook/webhook.service';
import { evolutionNumber, type EvolutionNumber } from './evolution-numbers';
import { EvolutionRate } from './evolution-rate';
import { EvolutionWebhookService } from './evolution-webhook.service';

/** The only header read: the instance token (never logged). */
const headersSchema = z.looseObject({ 'x-evolution-token': z.string().optional() });
type Headers = z.infer<typeof headersSchema>;

/** A name that is no instance of ours is a 404 like an unknown one (no hint which exist). */
const INSTANCE = z.string().regex(EVOLUTION_INSTANCE_RE);
const unknown = () => new NotFoundException();

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

  /** 429 over the limit, 404 unknown instance, 401 bad token, 500 when an item failed. */
  @Post(':instance')
  @HttpCode(200)
  async receive(
    @ZodParam('instance', INSTANCE, unknown) instance: string,
    @Req() req: { body: unknown; headers: unknown },
  ): Promise<void> {
    const now = new Date();
    const number = evolutionNumber(instance);
    if (!this.rate.take(instance, { known: number !== null, now: now.getTime() })) {
      throw new HttpException('too_many_requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    const known = this.authenticated({ number, headers: headersSchema.parse(req.headers), now });
    const delivery = parseEvolution(req.body, { now, where: known.where, instance });
    if (!delivery || delivery.kind === 'ignored') return;
    const work = this.evolution.apply(delivery, { numberId: known.id, now });
    await within(work, RESPONSE_BUDGET_MS);
  }

  private authenticated(at: { number: EvolutionNumber | null; headers: Headers; now: Date }) {
    if (!at.number) throw unknown();
    const verdict = verifyEvolution({ headers: at.headers, token: at.number.token });
    if (verdict === 'ok') return at.number;
    // Debug only, like the other webhook routes: the verdict, never a header value.
    this.log.debug(`evolution webhook refused (401): ${verdict}`);
    throw new UnauthorizedException();
  }
}
