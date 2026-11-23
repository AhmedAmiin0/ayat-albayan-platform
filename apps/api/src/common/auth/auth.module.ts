import type { Locale } from '@ab/core';
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
import { TestFlagRepo, TestFlagReader } from './test-flag';
import { createTokenVerifier, type AuthUser } from './verify-token';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly zones: MeZoneRepo) {}

  /**
   * Who am I — used by web/mobile after login to route by role and gate pages by permission,
   * `tz`: the zone their screens read times in (docs/34 §2; null → the device's), `locale`:
   * their language (profiles.locale; null → the app keeps its own), and `is_test`: a test
   * account (docs/56), for the «تجريبي» chip and the client-side checks it may skip.
   */
  @Get('me')
  @SignedIn()
  async me(@CurrentUser() user: AuthUser): Promise<AuthMe> {
    const { isTest = false, ...me } = user;
    const reads = [this.zones.zoneOf(user.id), this.zones.localeOf(user.id)] as const;
    const [tz, locale] = await Promise.all(reads);
    return { ...me, permissions: user.permissions ?? [], tz, locale, is_test: isTest };
  }
}

type AuthMe = Omit<AuthUser, 'isTest'> & {
  permissions: readonly string[];
  tz: string | null;
  locale: Locale | null;
  is_test: boolean;
};

/**
 * Global so the roles module can clear the permission cache after a change, PushAudience can check
 * a recipient's permissions, and the test-account switches can drop a cached flag.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: TOKEN_VERIFIER,
      useFactory: () => {
        const env = loadEnv();
        const jwtSecret = env.SUPABASE_JWT_SECRET;
        return createTokenVerifier({ supabaseUrl: env.SUPABASE_URL, jwtSecret });
      },
    },
    {
      provide: PermissionCache,
      inject: [{ token: SharedCache, optional: true }],
      useFactory: (shared?: SharedCache) => new PermissionCache(Date.now, shared),
    },
    {
      provide: PERMISSION_RESOLVER,
      inject: [DB, PermissionCache, TestFlagReader],
      useFactory: (db: Db, cache: PermissionCache, flags: TestFlagReader) =>
        dbPermissionResolver({ db, cache, flags }),
    },
    TestFlagRepo,
    {
      provide: TestFlagReader,
      inject: [TestFlagRepo],
      useFactory: (repo: TestFlagRepo) => new TestFlagReader(repo),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    MeZoneRepo,
  ],
  exports: [PermissionCache, PERMISSION_RESOLVER, MeZoneRepo, TestFlagReader],
})
export class AuthModule {}
