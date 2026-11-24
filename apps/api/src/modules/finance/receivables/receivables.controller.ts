import type { ReceivablesView } from '@ab/money';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { ReceivablesService } from './receivables.service';

/** Who owes, how much and for how long (aging); admin only; CSV at /exports/receivables.csv. */
@ApiTags('receivables')
@ApiBearerAuth()
@Permissions('receivables.read')
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Get()
  list(): Promise<ReceivablesView> {
    return this.receivables.list();
  }
}
