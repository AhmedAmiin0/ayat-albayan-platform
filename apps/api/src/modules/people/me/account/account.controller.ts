import {
  accountSetupRoutes,
  avatarSetSchema,
  avatarUploadSchema,
  emailChangeSchema,
  localeUpdateSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  type AccountProfile,
  type LocaleUpdate,
  type SignedUpload,
} from '@ab/shared';
import { Controller, Delete, Get, HttpCode, Inject, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SignedIn } from '@/common/auth/decorators';
import { MeZoneRepo } from '@/common/auth/me-zone.repo';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodBody } from '@/common/http/zod-inputs';
import { AccountAvatarService } from './account.avatar.service';
import { AccountService } from './account.service';
import { AccountSetupService } from './account.setup.service';

/** R-ACC-01..05: the caller's own login only, no id in any path; disabled accounts get 403. */
@ApiTags('me')
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

  /** Read back by /auth/me and /portal/me. */
  @Patch('me/locale')
  async setLocale(
    @ZodBody(localeUpdateSchema) body: LocaleUpdate,
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

  @Get('me/profile')
  profile(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.account.profile(user);
  }

  @Patch('me/profile')
  updateProfile(
    @ZodBody(profileUpdateSchema) body: z.output<typeof profileUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.account.updateProfile(user, body);
  }

  @Put('me/email')
  changeEmail(
    @ZodBody(emailChangeSchema) body: z.output<typeof emailChangeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.account.changeEmail(user, body);
  }

  @Put('me/password')
  @HttpCode(204)
  changePassword(
    @ZodBody(passwordChangeSchema) body: z.output<typeof passwordChangeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.account.changePassword(user, body);
  }

  @Post('me/avatar/upload-url')
  avatarUploadUrl(
    @ZodBody(avatarUploadSchema) body: z.output<typeof avatarUploadSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.avatar.uploadUrl(user, body);
  }

  @Put('me/avatar')
  setAvatar(
    @ZodBody(avatarSetSchema) body: z.output<typeof avatarSetSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.avatar.set(user, body.path);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.avatar.remove(user);
  }
}
