import {
  avatarSetSchema,
  avatarUploadSchema,
  emailChangeSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  type AccountProfile,
  type SignedUpload,
} from '@ab/shared';
import { Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SignedIn } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { AccountAvatarService } from './account.avatar.service';
import { AccountService } from './account.service';

/**
 * «حسابي» (R-ACC-01..05): every signed-in user (any role, custom roles, students, guardians) on
 * their OWN login: no id in any path, the token's subject is the profile. A disabled account is
 * still refused by the AuthGuard (403 account_disabled).
 */
@ApiTags('me')
@ApiBearerAuth()
@SignedIn()
@Controller('me')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly avatar: AccountAvatarService,
  ) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.account.profile(user);
  }

  @Patch('profile')
  updateProfile(
    @ZodBody(profileUpdateSchema) body: z.output<typeof profileUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.account.updateProfile(user, body);
  }

  @Put('email')
  changeEmail(
    @ZodBody(emailChangeSchema) body: z.output<typeof emailChangeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.account.changeEmail(user, body);
  }

  @Put('password')
  @HttpCode(204)
  changePassword(
    @ZodBody(passwordChangeSchema) body: z.output<typeof passwordChangeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.account.changePassword(user, body);
  }

  @Post('avatar/upload-url')
  avatarUploadUrl(
    @ZodBody(avatarUploadSchema) body: z.output<typeof avatarUploadSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.avatar.uploadUrl(user, body);
  }

  @Put('avatar')
  setAvatar(
    @ZodBody(avatarSetSchema) body: z.output<typeof avatarSetSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AccountProfile> {
    return this.avatar.set(user, body.path);
  }

  @Delete('avatar')
  removeAvatar(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.avatar.remove(user);
  }
}
