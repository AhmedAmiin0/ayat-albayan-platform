import { commsSourceSchema, type CommsSourceView, type ParityView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { CommunicationsService } from './communications.service';

/**
 * docs/23 §2e steps 4–5: GET parity (settings.read; ids and «same / different / missing», never a
 * secret value) and the comms_source switch (numbers.manage; module refused with 409 parity_not_empty
 * while parity is non-empty, legacy always allowed). The switch never opens the send gate.
 */
@ApiTags('numbers')
@ApiBearerAuth()
@Controller('admin/communications')
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Get('parity')
  @Permissions('settings.read')
  parity(): Promise<ParityView> {
    return this.comms.parity();
  }

  @Post('source')
  @HttpCode(200)
  @Permissions('numbers.manage')
  setSource(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CommsSourceView> {
    return this.comms.setSource(parseOrThrow(commsSourceSchema, body).source, user.id);
  }
}
