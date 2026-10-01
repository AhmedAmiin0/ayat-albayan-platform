import { Module } from '@nestjs/common';
import { AuditModule } from './common/audit/audit.service';
import { AuthModule } from './common/auth/auth.module';
import { DbModule } from './common/db/db.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { HealthController } from './modules/health/health.controller';
import { JobApplicantsModule } from './modules/job-applicants/job-applicants.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MeModule } from './modules/me/me.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';

@Module({
  imports: [
    DbModule,
    AuditModule,
    AuthModule,
    GuardiansModule,
    StudentsModule,
    TeachersModule,
    LeadsModule,
    JobApplicantsModule,
    MeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
