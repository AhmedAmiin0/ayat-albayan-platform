import type { Type } from '@nestjs/common';
import { AuditModule } from '@/common/audit/audit.service';
import { AuthModule } from '@/common/auth/auth.module';
import { ConfigStoreModule } from '@/common/configuration/config-store/config-store.module';
import { IntegrationConfigModule } from '@/common/configuration/integrations/integration-config.module';
import { DbModule } from '@/common/db/db.module';
import { CacheModule } from '@/common/infra/cache/cache.module';
import { LessonEventsModule } from '@/common/infra/events/lesson-events';
import { PushModule } from '@/common/push/push.module';
import { SettingsModule } from '@/common/settings/settings.module';
import { AvatarsModule } from '@/common/storage/avatars/avatars.module';
import { StorageOpsModule } from '@/common/storage/probe';

/** The global infrastructure modules AppModule imports and every feature injects. */
export const INFRA: readonly Type[] = [
  ...[DbModule, CacheModule, IntegrationConfigModule, ConfigStoreModule, AuditModule],
  ...[AuthModule, SettingsModule, StorageOpsModule, AvatarsModule, LessonEventsModule, PushModule],
];
