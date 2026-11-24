import { Module } from '@nestjs/common';
import { firstOrigin } from '@/common/http/public-origin';
import { loadEnv } from '@/config/env/env';
import { RolesModule } from '@/modules/people/roles/roles.module';
import { TestAccountsModule } from '@/modules/people/test-accounts';
import { UserAccess } from './users.access';
import { SupabaseAuthAdmin } from './auth/users.auth.supabase';
import { StaffPhotoController } from './photo/staff-photo.controller';
import { UsersController } from './users.controller';
import { UsersCreateService } from './lifecycle/users.create.service';
import { UsersLifecycleService } from './lifecycle/users.lifecycle.service';
import { USER_STORE_PROVIDERS } from './store/users.store.provider';
import { UsersService } from './users.service';
import { UserJournal } from './audit/users.journal';
import { UserLogins } from './auth/users.logins';
import { UserProfileWriter } from './update/users.profile-writer';
import { UsersUpdateService } from './update/users.update.service';
import { AUTH_ADMIN, USERS_CONFIG, type UsersConfig } from './store/users.store';

/** PermissionCache comes from AuthModule, AuditService from AuditModule. */
@Module({
  imports: [RolesModule, TestAccountsModule],
  controllers: [UsersController, StaffPhotoController],
  providers: [
    UsersService,
    UsersCreateService,
    UsersLifecycleService,
    UserAccess,
    UsersUpdateService,
    UserProfileWriter,
    UserLogins,
    UserJournal,
    ...USER_STORE_PROVIDERS,
    { provide: AUTH_ADMIN, useClass: SupabaseAuthAdmin },
    {
      provide: USERS_CONFIG,
      useFactory: (): UsersConfig => {
        const env = loadEnv();
        return {
          passwordMinLength: env.AUTH_PASSWORD_MIN_LENGTH,
          // The staff app (the first origin), never the whole list (docs/51 §4).
          setPasswordUrl: `${firstOrigin(env.WEB_ORIGIN)}/set-password`,
        };
      },
    },
  ],
})
export class UsersModule {}
