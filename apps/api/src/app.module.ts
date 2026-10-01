import { Module } from '@nestjs/common';
import { AuditModule } from './common/audit/audit.service';
import { AuthModule } from './common/auth/auth.module';
import { DbModule } from './common/db/db.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [DbModule, AuditModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
