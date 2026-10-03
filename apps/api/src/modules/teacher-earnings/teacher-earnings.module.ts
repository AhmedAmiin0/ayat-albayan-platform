import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { TeacherEarningsController, TeacherOwnEarningsController } from './teacher-earnings.controller';
import { TeacherEarningsQueries } from './teacher-earnings.queries';
import { TeacherEarningsService } from './teacher-earnings.service';

/** Per-session teacher earnings and payments (migrations 176–179, docs/11 §8b). */
@Module({
  imports: [TeachersModule],
  controllers: [TeacherEarningsController, TeacherOwnEarningsController],
  providers: [TeacherEarningsQueries, TeacherEarningsService],
  exports: [TeacherEarningsQueries],
})
export class TeacherEarningsModule {}
