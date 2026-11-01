import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { RolesModule } from '@/modules/people/roles/roles.module';
import { UserAccess } from './users.access';
import { SupabaseAuthAdmin } from './auth/users.auth.supabase';
import { StaffPhotoController } from './photo/staff-photo.controller';
import { UsersController } from './users.controller';
import { UsersCreateService } from './lifecycle/users.create.service';
import { UsersLifecycleService } from './lifecycle/users.lifecycle.service';
import { UsersRepo } from './store/users.repo';
import { UsersService } from './users.service';
import { UserJournal } from './audit/users.journal';
import { UserLogins } from './auth/users.logins';
import { UserProfileWriter } from './update/users.profile-writer';
import { UsersUpdateService } from './update/users.update.service';
import { AUTH_ADMIN, USER_STORE, USERS_CONFIG, type UsersConfig } from './store/users.store';

/** «المستخدمون» (owner, 2026-10-06). PermissionCache comes from AuthModule, AuditService from AuditModule. */
@Module({
  imports: [RolesModule],
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
    { provide: USER_STORE, useClass: UsersRepo },
    { provide: AUTH_ADMIN, useClass: SupabaseAuthAdmin },
    {
      provide: USERS_CONFIG,
      useFactory: (): UsersConfig => {
        const env = loadEnv();
        return { passwordMinLength: env.AUTH_PASSWORD_MIN_LENGTH, setPasswordUrl: `${env.WEB_ORIGIN.replace(/\/+$/, '')}/set-password` };
      },
    },
  ],
})
export class UsersModule {}
