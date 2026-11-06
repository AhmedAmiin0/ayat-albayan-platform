import { evolutionConfigSchema, type EvolutionConfig, type EvolutionSyncView } from '@ab/shared';
import { Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { NumbersEvolution } from '@/modules/messaging/numbers';
import { evolutionFailure } from './evolution-failure';
import { syncEvolution } from './evolution-push';

const ID = z.uuid();

/**
 * Every Evolution option of a number (owner 2026-11-06: «make all the evolution api options
 * configurable»): saved (zod), pushed to its instance, read back («متزامن / غير متزامن»).
 * numbers.manage. No secret is ever in a body, an answer or a log.
 */
@ApiTags('numbers')
@ApiBearerAuth()
@Controller('admin/numbers/:id/evolution')
export class EvolutionConfigController {
  constructor(private readonly numbers: NumbersEvolution) {}

  /** Save, then push and read back (a save stands even when Evolution is unreachable: 502). */
  @Put('config')
  @Permissions('numbers.manage')
  async config(
    @ZodParam('id', ID) id: string,
    @ZodBody(evolutionConfigSchema) config: EvolutionConfig,
    @CurrentUser() user: AuthUser,
  ): Promise<EvolutionSyncView> {
    await this.numbers.saveConfig({ id, config, actorId: user.id });
    return this.sync(id, true);
  }

  /** Push the saved options again («مزامنة الآن»). */
  @Post('sync')
  @HttpCode(200)
  @Permissions('numbers.manage')
  push(@ZodParam('id', ID) id: string): Promise<EvolutionSyncView> {
    return this.sync(id, true);
  }

  /** Read back only («تحقق»): nothing is written to Evolution. */
  @Get('sync')
  @Permissions('numbers.manage')
  verify(@ZodParam('id', ID) id: string): Promise<EvolutionSyncView> {
    return this.sync(id, false);
  }

  private async sync(id: string, push: boolean): Promise<EvolutionSyncView> {
    const input = await this.numbers.pushInput(id);
    const view = await syncEvolution(input, { push, now: new Date() }).catch((e: unknown) => {
      throw evolutionFailure(e);
    });
    await this.numbers.saveSync(id, view);
    return view;
  }
}
