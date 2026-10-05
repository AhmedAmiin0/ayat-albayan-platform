import type { ReceivablesView } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { ReceivablesService } from './receivables.service';

/** «مستحق على الطلاب»: who owes, how much, how long (aging). Admin only. CSV: /exports/receivables.csv. */
@ApiTags('receivables')
@ApiBearerAuth()
@Roles('admin')
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Get()
  list(): Promise<ReceivablesView> {
    return this.receivables.list();
  }
}
