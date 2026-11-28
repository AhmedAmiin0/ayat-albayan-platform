import {
  accountRoutes as routes,
  accountSetupRoutes,
  type AccountProfile,
  type LocaleUpdate,
  type SignedUpload,
} from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, SignedIn } from '@/common/auth/decorators';
import { MeZoneRepo } from '@/common/auth/me-zone.repo';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { AccountAvatarService } from './account.avatar.service';
import { AccountService } from './account.service';
import { AccountSetupService } from './account.setup.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** R-ACC-01..05: the caller's own login only, no id in any path; disabled accounts get 403. */
@ApiBearerAuth()
@SignedIn()
@Controller()
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly avatar: AccountAvatarService,
    @Inject(AccountSetupService) private readonly firstSetup: AccountSetupService,
    @Inject(MeZoneRepo) private readonly me: MeZoneRepo,
  ) {}

  @Route(routes.locale)
  async setLocale(
    @RouteInput() { body }: In<'locale'>,
    @CurrentUser() user: AuthUser,
  ): Promise<LocaleUpdate> {
    await this.me.setLocale(user.id, body.locale);
    return { locale: body.locale };
  }

  /** A code-made teacher login's email + password, once (docs/46 A4); 409 setup_done after. */
  @Route(accountSetupRoutes.setup)
  @HttpCode(204)
  setup(
    @RouteInput() { body }: RouteInputOf<typeof accountSetupRoutes.setup>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.firstSetup.setup(user, body);
  }

  @Route(routes.profile)
  profile(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.account.profile(user);
  }

  @Route(routes.updateProfile)
  updateProfile(
    @RouteInput() { body }: In<'updateProfile'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.account.updateProfile(user, body);
  }

  @Route(routes.email)
  changeEmail(
    @RouteInput() { body }: In<'email'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.account.changeEmail(user, body);
  }

  @Route(routes.password)
  @HttpCode(204)
  changePassword(
    @RouteInput() { body }: In<'password'>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.account.changePassword(user, body);
  }

  @Route(routes.avatarUploadUrl)
  avatarUploadUrl(
    @RouteInput() { body }: In<'avatarUploadUrl'>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.avatar.uploadUrl(user, body);
  }

  @Route(routes.setAvatar)
  setAvatar(
    @RouteInput() { body }: In<'setAvatar'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.avatar.set(user, body.path);
  }

  @Route(routes.removeAvatar)
  removeAvatar(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.avatar.remove(user);
  }
}
