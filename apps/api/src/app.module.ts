import { Module } from '@nestjs/common';
import { AuditModule } from './common/audit/audit.service';
import { AuthModule } from './common/auth/auth.module';
import { DbModule } from './common/db/db.module';
import { SettingsModule } from './common/settings/settings.module';
import { BookingModule } from './modules/booking/booking.module';
import { FxModule } from './modules/fx/fx.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { HealthController } from './modules/health/health.controller';
import { JobApplicantsModule } from './modules/job-applicants/job-applicants.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { MeModule } from './modules/me/me.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';

@Module({
  imports: [
    DbModule,
    AuditModule,
    AuthModule,
    SettingsModule,
    GuardiansModule,
    StudentsModule,
    TeachersModule,
    LeadsModule,
    JobApplicantsModule,
    MeModule,
    FxModule,
    PricingModule,
    SchedulingModule,
    BookingModule,
    LessonsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
