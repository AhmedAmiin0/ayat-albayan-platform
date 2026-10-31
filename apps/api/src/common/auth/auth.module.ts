import { Controller, Get, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { loadEnv } from '@/config/env/env';
import { SharedCache } from '@/common/infra/cache/shared-cache';
import { DB, type Db } from '@/common/db/db.module';
import { AuthGuard, TOKEN_VERIFIER } from './auth.guard';
import { dbPermissionResolver } from './db-permission.resolver';
import { CurrentUser, SignedIn } from './decorators';
import { MeZoneRepo } from './me-zone.repo';
import { PermissionCache } from './permission.cache';
import { PERMISSION_RESOLVER } from './permissions';
import { createTokenVerifier, type AuthUser } from './verify-token';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly zones: MeZoneRepo) {}

  /**
   * Who am I — used by web/mobile after login to route by role and gate pages by permission, and
   * `tz`: the zone their screens read times in (docs/34 §2; null → the device's).
   */
  @Get('me')
  @SignedIn()
  async me(@CurrentUser() user: AuthUser): Promise<AuthMe> {
    return { ...user, permissions: user.permissions ?? [], tz: await this.zones.zoneOf(user.id) };
  }
}

type AuthMe = AuthUser & { permissions: readonly string[]; tz: string | null };

/** Global so the roles module can clear the permission cache after a change, and PushAudience can check a recipient's permissions. */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: TOKEN_VERIFIER,
      useFactory: () => {
        const env = loadEnv();
        return createTokenVerifier({ supabaseUrl: env.SUPABASE_URL, jwtSecret: env.SUPABASE_JWT_SECRET });
      },
    },
    {
      provide: PermissionCache,
      inject: [{ token: SharedCache, optional: true }],
      useFactory: (shared?: SharedCache) => new PermissionCache(Date.now, shared),
    },
    {
      provide: PERMISSION_RESOLVER,
      inject: [DB, PermissionCache],
      useFactory: (db: Db, cache: PermissionCache) => dbPermissionResolver({ db, cache }),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    MeZoneRepo,
  ],
  exports: [PermissionCache, PERMISSION_RESOLVER],
})
export class AuthModule {}
