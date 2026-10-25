import { AVATAR_MAX_BYTES, AVATAR_MIMES, type AccountProfile, type AvatarUpload, type SignedUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { avatarPath, isPathOf } from '../../common/storage/storage.paths';
import { SNIFF_BYTES, sniffMime } from '../booking/invoice/invoice-sniff';
import { badRequest, notFound } from '../../common/http/errors';
import { baseMime } from '../whatsapp/messages/inbound-media.service';
import { AccountPorts } from './account.ports.provider';
import { AccountService } from './account.service';

const isAvatarMime = (mime: string | null): boolean => AVATAR_MIMES.some((m) => m === mime);

/**
 * The profile photo (R-ACC-05), the receipt mechanics: a signed upload URL for
 * avatars/<uid>/avatar-<ms>.<ext>, then PUT /me/avatar registers it. The API trusts neither the
 * client nor the Content-Type it uploaded with: Storage's size and type, then the first bytes.
 */
@Injectable()
export class AccountAvatarService {
  constructor(
    private readonly ports: AccountPorts,
    private readonly account: AccountService,
  ) {}

  uploadUrl(user: AuthUser, input: AvatarUpload): Promise<SignedUpload> {
    return this.ports.files.uploadUrl(avatarPath({ userId: user.id, mime: input.mime }));
  }

  /** 400 avatar_path / avatar_type / avatar_too_large; a refused object is deleted. The previous photo goes. */
  async set(user: AuthUser, path: string): Promise<AccountProfile> {
    const ownFile = isPathOf(path, user.id) && path.startsWith(`${user.id}/avatar-`);
    const info = ownFile ? await this.ports.files.info(path) : null;
    if (!info) throw badRequest('avatar_path');
    await this.verify(path, { size: info.size, mime: baseMime(info.contentType) });
    const previous = await this.currentPath(user);
    await this.ports.store.update(user.id, { avatar_path: path });
    if (previous && previous !== path) await this.discard(previous);
    return this.account.profile(user);
  }

  async remove(user: AuthUser): Promise<AccountProfile> {
    const previous = await this.currentPath(user);
    if (previous) {
      await this.ports.store.update(user.id, { avatar_path: null });
      await this.discard(previous);
    }
    return this.account.profile(user);
  }

  private async verify(path: string, file: { size: number; mime: string }): Promise<void> {
    let code: string | null = null;
    if (!isAvatarMime(file.mime)) code = 'avatar_type';
    else if (file.size < 1 || file.size > AVATAR_MAX_BYTES) code = 'avatar_too_large';
    else if (sniffMime((await this.ports.files.head(path, SNIFF_BYTES)) ?? new Uint8Array()) !== file.mime) code = 'avatar_type';
    if (code === null) return;
    await this.discard(path);
    throw badRequest(code);
  }

  private async currentPath(user: AuthUser): Promise<string | null> {
    const row = await this.ports.store.get(user.id);
    if (!row) throw notFound('profile_not_found');
    return row.avatar_path;
  }

  /** Best effort: an orphaned object in the user's own folder is harmless. */
  private async discard(path: string): Promise<void> {
    await this.ports.files.remove(path).catch(() => undefined);
  }
}
