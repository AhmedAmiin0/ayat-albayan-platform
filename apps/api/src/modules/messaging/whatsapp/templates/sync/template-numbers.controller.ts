import { numberTemplatesRoutes as routes, type TemplateNumberSyncView } from '@ab/shared';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TemplateManagerGuard } from '@/modules/messaging/whatsapp/templates/catalog/template-manager.guard';
import { TemplateNumbers } from './template-numbers.service';

@ApiBearerAuth()
@Controller()
export class TemplateNumbersController {
  constructor(private readonly templates: TemplateNumbers) {}

  @Route(routes.sync)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  sync(
    @RouteInput() { params }: RouteInputOf<typeof routes.sync>,
  ): Promise<TemplateNumberSyncView> {
    return this.templates.sync(params.id);
  }
}
