import { Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { RolesModule } from '../roles/roles.module';
import { UserAccess } from './users.access';
import { SupabaseAuthAdmin } from './users.auth.supabase';
import { UsersController } from './users.controller';
import { UsersCreateService } from './users.create.service';
import { UsersLifecycleService } from './users.lifecycle.service';
import { UserEffects, UserPorts } from './users.ports';
import { UsersQueries } from './users.queries';
import { UsersService } from './users.service';
import { AUTH_ADMIN, USER_STORE, USERS_CONFIG, type UsersConfig } from './users.store';

/** «المستخدمون» (owner, 2026-10-06). PermissionCache comes from AuthModule, AuditService from AuditModule. */
@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersCreateService,
    UsersLifecycleService,
    UserAccess,
    UserPorts,
    UserEffects,
    { provide: USER_STORE, useClass: UsersQueries },
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
