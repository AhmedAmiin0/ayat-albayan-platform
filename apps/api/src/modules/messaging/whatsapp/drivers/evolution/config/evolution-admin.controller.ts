import type { EvolutionQrView, EvolutionStateView } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Permissions } from '@/common/auth/decorators';
import { ZodParam } from '@/common/http/zod-inputs';
import { NumbersEvolution } from '@/modules/messaging/numbers';
import { evolutionFailure as failure } from './evolution-failure';
import { instanceQr, instanceState } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-instance';

const ID = z.uuid();

/**
 * An Evolution number's connection (docs/19 «Evolution driver»): its state («افحص الاتصال») and
 * the QR to link the phone. numbers.manage: the QR links a WhatsApp account to the academy.
 * Two read calls to the number's own instance; never a send; no token leaves the server.
 */
@ApiTags('numbers')
@ApiBearerAuth()
@Controller('admin/numbers/:id/evolution')
export class NumbersEvolutionController {
  constructor(private readonly numbers: NumbersEvolution) {}

  @Get('state')
  @Permissions('numbers.manage')
  async state(@ZodParam('id', ID) id: string): Promise<EvolutionStateView> {
    const env = await this.numbers.instanceEnv(id);
    const state = await instanceState({ env }).catch((e: unknown) => {
      throw failure(e);
    });
    return { state, checked_at: new Date().toISOString() };
  }

  @Get('qr')
  @Permissions('numbers.manage')
  async qr(@ZodParam('id', ID) id: string): Promise<EvolutionQrView> {
    const env = await this.numbers.instanceEnv(id);
    const q = await instanceQr({ env }).catch((e: unknown) => {
      throw failure(e);
    });
    return { state: q.state, qr: q.qr, pairing_code: q.pairingCode };
  }
}
