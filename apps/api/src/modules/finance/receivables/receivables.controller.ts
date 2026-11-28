import type { ReceivablesView } from '@ab/money';
import { receivablesRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route } from '@/common/http/route';
import { ReceivablesService } from './receivables.service';

/** Who owes, how much and for how long (aging); admin only; CSV at /exports/receivables.csv. */
@ApiBearerAuth()
@Controller()
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Route(routes.list)
  list(): Promise<ReceivablesView> {
    return this.receivables.list();
  }
}
