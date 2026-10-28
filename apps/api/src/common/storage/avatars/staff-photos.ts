import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../db/db.module';
import { dbError } from '../../http/http';
import { AVATAR_FILES, type AvatarFiles } from './avatar-files';

/** A staff member's photo: their login's own when set, else the one an admin put on the teacher record. */
export function staffPhotoPath(input: { own: string | null | undefined; teacher: string | null | undefined }): string | null {
  return input.own || input.teacher || null;
}

/**
 * Signed photo URLs of the staff a response shows (owner 2026-10-28: staff photos everywhere; students,
 * families and WhatsApp contacts are initials only). Every list signs its photos in ONE Storage call;
 * the bucket stays private and a URL lives 15 minutes. A person without a photo is absent from the map.
 * A photo is a hint: a failed lookup logs and shows initials, it never takes the page down.
 */
@Injectable()
export class StaffPhotos {
  private readonly log = new Logger(StaffPhotos.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AVATAR_FILES) private readonly files: AvatarFiles,
  ) {}

  /** id → url for the rows that have a path. */
  async sign(rows: readonly { id: string; path: string | null }[]): Promise<Map<string, string>> {
    const withPath = rows.filter((r): r is { id: string; path: string } => r.path !== null);
    const urls = await this.files.urls(withPath.map((r) => r.path));
    const out = new Map<string, string>();
    for (const r of withPath) {
      const url = urls.get(r.path);
      if (url) out.set(r.id, url);
    }
    return out;
  }

  /** teacher id → url. One query for the page's teachers, one signing call. */
  ofTeachers(ids: readonly string[]): Promise<Map<string, string>> {
    return this.hint(this.teachers(ids));
  }

  /** profile id → url (its own photo, else its linked teacher record's). Two reads, one signing call. */
  ofProfiles(ids: readonly string[]): Promise<Map<string, string>> {
    return this.hint(this.profiles(ids));
  }

  private async hint(lookup: Promise<Map<string, string>>): Promise<Map<string, string>> {
    try {
      return await lookup;
    } catch (e) {
      this.log.warn(`staff photo lookup failed: ${e instanceof Error ? e.message : String(e)}`);
      return new Map();
    }
  }

  private async teachers(ids: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const { data, error } = await this.db
      .from('teachers')
      .select('id, avatar_path, profile:profiles!teachers_profile_id_fkey(avatar_path)')
      .in('id', unique);
    if (error) throw dbError(error);
    return this.sign(data.map((t) => ({ id: t.id, path: staffPhotoPath({ own: t.profile?.avatar_path, teacher: t.avatar_path }) })));
  }

  private async profiles(ids: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const [profiles, teachers] = await Promise.all([
      this.db.from('profiles').select('id, avatar_path').in('id', unique),
      this.db.from('teachers').select('profile_id, avatar_path').in('profile_id', unique).not('avatar_path', 'is', null),
    ]);
    if (profiles.error) throw dbError(profiles.error);
    if (teachers.error) throw dbError(teachers.error);
    const ofTeacher = new Map(teachers.data.map((t) => [t.profile_id, t.avatar_path]));
    return this.sign(profiles.data.map((p) => ({ id: p.id, path: staffPhotoPath({ own: p.avatar_path, teacher: ofTeacher.get(p.id) }) })));
  }
}
