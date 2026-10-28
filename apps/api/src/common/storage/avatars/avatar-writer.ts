import { AVATAR_MAX_BYTES, AVATAR_MIMES, baseMime } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { SNIFF_BYTES, sniffMime } from '../file-sniff';
import { badRequest } from '../../http/errors';
import { AVATAR_FILES, type AvatarFiles } from './avatar-files';

/** Where one person's photo path is stored (profiles.avatar_path or teachers.avatar_path). */
export interface AvatarSlot {
  /** Is `path` an object of this slot's own folder (signed for it)? */
  owns(path: string): boolean;
  read(): Promise<string | null>;
  write(path: string | null): Promise<void>;
}

const isAvatarMime = (mime: string | null): boolean => AVATAR_MIMES.some((m) => m === mime);

/**
 * Registers or removes a photo, the ONE path for every photo (R-ACC-05 and the admin's staff photos).
 * The API trusts neither the client nor the Content-Type it uploaded with: Storage's size and type,
 * then the first bytes. 400 avatar_path / avatar_type / avatar_too_large; a refused object is deleted;
 * the previous photo goes.
 */
@Injectable()
export class AvatarWriter {
  constructor(@Inject(AVATAR_FILES) readonly files: AvatarFiles) {}

  /** The previous path (null when none) and the new one. */
  async set(slot: AvatarSlot, path: string): Promise<{ before: string | null; after: string }> {
    const info = slot.owns(path) ? await this.files.info(path) : null;
    if (!info) throw badRequest('avatar_path');
    await this.verify(path, { size: info.size, mime: baseMime(info.contentType) });
    const before = await slot.read();
    await slot.write(path);
    if (before && before !== path) await this.discard(before);
    return { before, after: path };
  }

  /** The removed path, null when there was no photo (nothing is written then). */
  async clear(slot: AvatarSlot): Promise<string | null> {
    const before = await slot.read();
    if (!before) return null;
    await slot.write(null);
    await this.discard(before);
    return before;
  }

  private async verify(path: string, file: { size: number; mime: string }): Promise<void> {
    let code: string | null = null;
    if (!isAvatarMime(file.mime)) code = 'avatar_type';
    else if (file.size < 1 || file.size > AVATAR_MAX_BYTES) code = 'avatar_too_large';
    else if (sniffMime((await this.files.head(path, SNIFF_BYTES)) ?? new Uint8Array()) !== file.mime) code = 'avatar_type';
    if (code === null) return;
    await this.discard(path);
    throw badRequest(code);
  }

  /** Best effort: an orphaned object in the person's own folder is harmless. */
  private async discard(path: string): Promise<void> {
    await this.files.remove(path).catch(() => undefined);
  }
}
