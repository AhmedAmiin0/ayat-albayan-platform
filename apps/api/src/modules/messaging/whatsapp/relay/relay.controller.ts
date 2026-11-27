import { Body, Controller, Headers, HttpCode, UseGuards } from '@nestjs/common';
import { Public } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';
import { relayError } from './relay.errors';
import { RelayLimit } from './relay.limit';
import { relayRoutes as routes } from './relay.routes';
import { relayRequestSchema } from './relay.schema';
import { RelayService, type RelaySent } from './relay.service';

const ME = {
  account: { name: 'Ayat Al-Bayan platform relay' },
  key: { scopes: ['messages:send'] },
};

/** The first zod issue as the CRM would word it: «<path>: <message>». */
function invalid(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const first = issues[0];
  const where = first?.path.map(String).join('.');
  const message = where
    ? `${where}: ${first?.message ?? ''}`
    : (first?.message ?? 'invalid request');
  return relayError({ status: 422, code: 'invalid_request', message });
}

/**
 * The CRM-compatible relay for the old Apps Script (docs/19 «script relay»). Public like
 * /webhooks/* (no user JWT): authenticated by the notifications line's own CRM API key as a
 * Bearer. Never gated by automatic messages: the script decides what to send.
 */
@Public()
@UseGuards(RelayLimit)
@Controller()
export class RelayController {
  constructor(private readonly relay: RelayService) {}

  @Route(routes.me)
  async me(@Headers('authorization') auth?: string): Promise<{ data: typeof ME }> {
    await this.relay.authorize(auth);
    return { data: ME };
  }

  @Route(routes.send)
  @HttpCode(201)
  async send(
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ): Promise<{ data: RelaySent }> {
    const line = await this.relay.authorize(auth);
    const parsed = relayRequestSchema.safeParse(body);
    if (!parsed.success) throw invalid(parsed.error.issues);
    return { data: await this.relay.send(line, parsed.data) };
  }
}
