import type { ReceivablesView } from '@ab/money';
import { receivablesRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';
import { ReceivablesService } from './receivables.service';

/** Who owes, how much and for how long (aging); admin only; CSV at /exports/receivables.csv. */
@ApiTags('receivables')
@ApiBearerAuth()
@Permissions('receivables.read')
@Controller()
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Route(routes.list)
  list(): Promise<ReceivablesView> {
    return this.receivables.list();
  }
}
