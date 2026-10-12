import {
  avatarSetSchema,
  avatarUploadSchema,
  emailChangeSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  type AccountProfile,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SignedIn } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
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
  updateProfile(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.account.updateProfile(user, parseOrThrow(profileUpdateSchema, body));
  }

  @Put('email')
  changeEmail(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.account.changeEmail(user, parseOrThrow(emailChangeSchema, body));
  }

  @Put('password')
  @HttpCode(204)
  changePassword(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    return this.account.changePassword(user, parseOrThrow(passwordChangeSchema, body));
  }

  @Post('avatar/upload-url')
  avatarUploadUrl(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SignedUpload> {
    return this.avatar.uploadUrl(user, parseOrThrow(avatarUploadSchema, body));
  }

  @Put('avatar')
  setAvatar(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.avatar.set(user, parseOrThrow(avatarSetSchema, body).path);
  }

  @Delete('avatar')
  removeAvatar(@CurrentUser() user: AuthUser): Promise<AccountProfile> {
    return this.avatar.remove(user);
  }
}
