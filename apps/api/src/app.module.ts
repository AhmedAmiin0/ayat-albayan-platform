import { Module } from '@nestjs/common';
import { AuthModule } from './common/auth/auth.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
