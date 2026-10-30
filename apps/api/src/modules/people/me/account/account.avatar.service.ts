import type { AccountProfile, AvatarUpload, SignedUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { AvatarWriter, type AvatarSlot } from '../../../../common/storage/avatars/avatar-writer';
import { avatarPath, isUserAvatarPathOf } from '../../../../common/storage/storage.paths';
import { AccountPorts } from './account.ports.provider';
import { AccountService } from './account.service';

/**
 * The profile photo (R-ACC-05), the receipt mechanics: a signed upload URL for
 * avatars/<uid>/avatar-<ms>.<ext>, then PUT /me/avatar registers it through the shared AvatarWriter
 * (the admin's staff photos use the same one).
 */
@Injectable()
export class AccountAvatarService {
  constructor(
    private readonly ports: AccountPorts,
    private readonly account: AccountService,
    private readonly writer: AvatarWriter,
  ) {}

  uploadUrl(user: AuthUser, input: AvatarUpload): Promise<SignedUpload> {
    return this.ports.files.uploadUrl(avatarPath({ userId: user.id, mime: input.mime }));
  }

  /** 400 avatar_path / avatar_type / avatar_too_large; a refused object is deleted. The previous photo goes. */
  async set(user: AuthUser, path: string): Promise<AccountProfile> {
    await this.writer.set(this.slot(user), path);
    return this.account.profile(user);
  }

  async remove(user: AuthUser): Promise<AccountProfile> {
    await this.writer.clear(this.slot(user));
    return this.account.profile(user);
  }

  private slot(user: AuthUser): AvatarSlot {
    const { store } = this.ports;
    return {
      owns: (path) => isUserAvatarPathOf(path, user.id),
      read: async () => {
        const row = await store.get(user.id);
        if (!row) throw notFound('profile_not_found');
        return row.avatar_path;
      },
      write: (path) => store.update(user.id, { avatar_path: path }),
    };
  }
}
