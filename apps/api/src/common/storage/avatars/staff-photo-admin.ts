import type { AvatarUpload, SignedUpload, StaffPhotoView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { AuditService } from '@/common/audit/audit.service';
import { DB, type Db } from '@/common/db/db.module';
import { badRequest, notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';
import { avatarPath, teacherAvatarPath } from '@/common/storage/storage.paths';
import { AvatarWriter, type AvatarSlot } from './avatar-writer';
import { profileSlot, teacherSlot } from './photo-slots';
import { NOT_STAFF } from './staff-photos';

type Who = { kind: 'teacher' | 'user'; id: string };

interface Found<T> {
  data: T | null;
  error: PostgrestError | null;
}

/** The row of a single read: a database error throws, a missing row is a 404 `code`. */
function orNotFound<T>({ data, error }: Found<T>, code: string): NonNullable<T> {
  if (error) throw dbError(error);
  if (!data) throw notFound(code);
  return data;
}

const OWNER = {
  teacher: async (db, id) => {
    const found = await db.from('teachers').select('profile_id').eq('id', id).maybeSingle();
    const { profile_id } = orNotFound(found, 'teacher_not_found');
    return profile_id ? { kind: 'user', id: profile_id } : { kind: 'teacher', id };
  },
  user: async (db, id) => {
    const { role } = orNotFound(await db.from('profiles').select('role').eq('id', id).maybeSingle(), 'user_not_found');
    if (NOT_STAFF.has(role)) throw badRequest('avatar_not_staff');
    return { kind: 'user', id };
  },
} satisfies Record<Who['kind'], (db: Db, id: string) => Promise<Who>>;

/**
 * An admin's photo of a staff member (owner 2026-10-28), through the same AvatarWriter as «حسابي»:
 * a teacher WITH a login gets its login's photo (avatars/{profile_id}/…), one without a login the
 * teacher record's (avatars/teachers/{teacher_id}/…). Every change writes one audit_log row (paths only).
 * The routes' guards (teachers.write, users.write) decide who may call it.
 */
@Injectable()
export class StaffPhotoAdmin {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly writer: AvatarWriter,
    private readonly audit: AuditService,
  ) {}

  async uploadUrl(who: Who, input: AvatarUpload): Promise<SignedUpload> {
    const owner = await this.owner(who);
    const path = owner.kind === 'teacher'
      ? teacherAvatarPath({ teacherId: owner.id, mime: input.mime })
      : avatarPath({ userId: owner.id, mime: input.mime });
    return this.writer.files.uploadUrl(path);
  }

  /** 400 avatar_path / avatar_type / avatar_too_large / avatar_not_staff; 404 for an unknown id. */
  async set(who: Who, input: { path: string; actorId: string }): Promise<StaffPhotoView> {
    const owner = await this.owner(who);
    const { before, after } = await this.writer.set(this.slot(owner), input.path);
    // A record photo from before the login was linked would come back if the login's were cleared.
    const stale = await this.clearRecord(who, owner);
    await this.record(who, { actorId: input.actorId, action: 'avatar_set', before: { avatar_path: before, teacher_avatar_path: stale }, after });
    return { avatar_url: await this.writer.files.url(after) };
  }

  /** A linked teacher loses both: its login's photo and the record's (no photo shows afterwards). */
  async remove(who: Who, actorId: string): Promise<StaffPhotoView> {
    const owner = await this.owner(who);
    const before = await this.writer.clear(this.slot(owner));
    const record = await this.clearRecord(who, owner);
    if (before || record) await this.record(who, { actorId, action: 'avatar_remove', before: { avatar_path: before, teacher_avatar_path: record }, after: null });
    return { avatar_url: null };
  }

  /** A linked teacher's own record photo (null when none, or not a linked teacher). */
  private clearRecord(who: Who, owner: Who): Promise<string | null> {
    return who.kind === 'teacher' && owner.kind === 'user' ? this.writer.clear(teacherSlot(this.db, who.id)) : Promise.resolve(null);
  }

  private slot(owner: Who): AvatarSlot {
    return owner.kind === 'teacher' ? teacherSlot(this.db, owner.id) : profileSlot(this.db, owner.id);
  }

  /** Where the photo lives: a teacher's login when it has one, else the record; a user must be staff. */
  private owner(who: Who): Promise<Who> {
    return OWNER[who.kind](this.db, who.id);
  }

  private record(who: Who, entry: { actorId: string; action: string; before: Record<string, string | null>; after: string | null }) {
    return this.audit.record({
      actorId: entry.actorId,
      entity: who.kind === 'teacher' ? 'teachers' : 'profiles',
      entityId: who.id,
      action: entry.action,
      before: entry.before,
      after: { avatar_path: entry.after },
    });
  }
}
