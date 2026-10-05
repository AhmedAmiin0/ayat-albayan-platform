import { Controller, Get, Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { loadEnv } from '../../env';
import { AuthGuard, TOKEN_VERIFIER } from './auth.guard';
import type { MeView } from '@ab/shared';
import { CurrentUser } from './decorators';
import { PermissionResolver, type ResolvedAccess } from './permission-resolver';
import { PermissionsModule } from './permissions.module';
import { createTokenVerifier, type AuthUser } from './verify-token';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  private readonly log = new Logger(AuthController.name);

  constructor(private readonly permissions: PermissionResolver) {}

  /**
   * Who am I: used by web/mobile after login to route by role. `role` is the base role (the JWT
   * claim); `permissions` is resolved now, so a role change shows up on the next call. A failed
   * lookup degrades for a non-admin base role (plain user, no permissions: their access never
   * depended on it); for an admin it fails, like every admin-permission check.
   */
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<MeView> {
    const access = await this.access(user);
    return {
      ...user,
      fullName: access.fullName,
      locale: access.locale,
      tz: access.tz,
      roleKey: access.roleKey,
      permissions: [...access.permissions].sort(),
    };
  }

  private async access(user: AuthUser): Promise<ResolvedAccess> {
    try {
      return await this.permissions.resolve(user.id);
    } catch (error) {
      if (user.role === 'admin') throw error;
      this.log.error(`permission lookup failed for ${user.id}: ${String(error)}`);
      return { roleKey: null, permissions: new Set(), fullName: null, locale: null, tz: null };
    }
  }
}

@Module({
  imports: [PermissionsModule],
  controllers: [AuthController],
  providers: [
    {
      provide: TOKEN_VERIFIER,
      useFactory: () => {
        const env = loadEnv();
        return createTokenVerifier({ supabaseUrl: env.SUPABASE_URL, jwtSecret: env.SUPABASE_JWT_SECRET });
      },
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
