import {
  evolutionConfigSchema, evolutionSyncFailed, type EvolutionConfig, type EvolutionSyncView,
} from '@ab/shared';
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

/** Saved (zod), pushed and read back; numbers.manage; no secret in a body, answer or log. */
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
    return this.sync(id, { push: true, saved: true });
  }

  @Post('sync')
  @HttpCode(200)
  @Permissions('numbers.manage')
  push(@ZodParam('id', ID) id: string): Promise<EvolutionSyncView> {
    return this.sync(id, { push: true, saved: false });
  }

  /** Read back only: nothing is written to Evolution. */
  @Get('sync')
  @Permissions('numbers.manage')
  verify(@ZodParam('id', ID) id: string): Promise<EvolutionSyncView> {
    return this.sync(id, { push: false, saved: false });
  }

  /** A failure first stores unsynced, so an older synced state never outlives it. */
  private async sync(
    id: string,
    at: { push: boolean; saved: boolean },
  ): Promise<EvolutionSyncView> {
    const now = new Date();
    try {
      const view = await syncEvolution(await this.numbers.pushInput(id), { push: at.push, now });
      await this.numbers.saveSync(id, view);
      return view;
    } catch (e) {
      await this.numbers.saveSync(id, evolutionSyncFailed(now)).catch(() => undefined);
      throw evolutionFailure(e, at.saved);
    }
  }
}
