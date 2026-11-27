import {
  numbersRoutes as routes,
  ownTrafficViewSchema,
  type ImportResult,
  type NumberView,
  type OwnTrafficView,
} from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { NumbersImport } from './import/numbers.import';
import { NumbersService } from './numbers.service';
import { OwnNumbers } from './own/own-numbers';

/** docs/23 §3: secrets are write-only. */
@ApiBearerAuth()
@Controller()
export class NumbersController {
  constructor(
    private readonly numbers: NumbersService,
    private readonly importer: NumbersImport,
    private readonly own: OwnNumbers,
  ) {}

  @Route(routes.list)
  list(): Promise<NumberView[]> {
    return this.numbers.list();
  }

  @Route(routes.ownTraffic)
  async ownTraffic(): Promise<OwnTrafficView> {
    return asResponse(ownTrafficViewSchema, { inbound_7d: await this.own.weekInbound() });
  }

  @Route(routes.create)
  @HttpCode(201)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.create(body, user.id);
  }

  @Route(routes.import)
  @HttpCode(200)
  import(
    @RouteInput() { body }: RouteInputOf<typeof routes.import>,
    @CurrentUser() user: AuthUser,
  ): Promise<ImportResult> {
    return this.importer.run(body.dryRun, user.id);
  }

  @Route(routes.update)
  update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.update(params.id, body, user.id);
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.numbers.remove(params.id, user.id);
  }

  @Route(routes.setSecret)
  setSecret(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.setSecret>,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.setSecret({ ...params, value: body.value }, user.id);
  }

  @Route(routes.clearSecret)
  clearSecret(
    @RouteInput() { params }: RouteInputOf<typeof routes.clearSecret>,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.clearSecret(params, user.id);
  }
}
