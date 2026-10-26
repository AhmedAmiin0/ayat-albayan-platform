import { Module } from '@nestjs/common';
import { GuardiansModule } from '../guardians/guardians.module';
import { MergeService } from './merge.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [GuardiansModule],
  controllers: [StudentsController],
  providers: [StudentsService, MergeService],
})
export class StudentsModule {}
