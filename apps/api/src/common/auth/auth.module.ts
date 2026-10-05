import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { loadEnv } from '../../env';
import { AuthGuard, TOKEN_VERIFIER } from './auth.guard';
import type { MeView } from '@ab/shared';
import { CurrentUser } from './decorators';
import { PermissionResolver } from './permission-resolver';
import { PermissionsModule } from './permissions.module';
import { createTokenVerifier, type AuthUser } from './verify-token';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly permissions: PermissionResolver) {}

  /**
   * Who am I: used by web/mobile after login to route by role. `role` is the base role (the JWT
   * claim); `permissions` is resolved now, so a role change shows up on the next call.
   */
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<MeView> {
    const access = await this.permissions.resolve(user.id);
    return {
      ...user,
      fullName: access.fullName,
      locale: access.locale,
      tz: access.tz,
      roleKey: access.roleKey,
      permissions: [...access.permissions].sort(),
    };
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
