import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { invalidRequest } from './relay.errors';
import { RelayLimit } from './relay.limit';
import { relayRequestSchema } from './relay.schema';
import { RelayService, type RelaySent } from './relay.service';

/** The script's CRM_URL is this base; it appends /api/v1/me and /api/v1/messages itself. */
const RELAY_BASE = 'script-relay';

const ME = {
  account: { name: 'Ayat Al-Bayan platform relay' },
  key: { scopes: ['messages:send'] },
};

/**
 * The CRM-compatible relay for the old Apps Script (docs/19 «script relay»). Public like
 * /webhooks/* (no user JWT): authenticated by the notifications line's own CRM API key as a
 * Bearer. Never gated by automatic messages: the script decides what to send.
 */
@ApiTags('webhooks')
@Public()
@UseGuards(RelayLimit)
@Controller(`${RELAY_BASE}/api/v1`)
export class RelayController {
  constructor(private readonly relay: RelayService) {}

  @Get('me')
  async me(@Headers('authorization') auth?: string): Promise<{ data: typeof ME }> {
    await this.relay.authorize(auth);
    return { data: ME };
  }

  @Post('messages')
  @HttpCode(201)
  async send(
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ): Promise<{ data: RelaySent }> {
    const line = await this.relay.authorize(auth);
    const parsed = relayRequestSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest(parsed.error.issues);
    return { data: await this.relay.send(line, parsed.data) };
  }
}
