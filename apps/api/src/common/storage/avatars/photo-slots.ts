import type { Db } from '../../db/db.module';
import { dbError } from '../../http/http';
import { notFound } from '../../http/errors';
import { isTeacherAvatarPathOf, isUserAvatarPathOf } from '../storage.paths';
import type { AvatarSlot } from './avatar-writer';

// The two places a staff photo is stored, as AvatarWriter slots, for the admin's photo endpoints
// (service role: the routes' guards decide who may call them, rule 9).

/** profiles.avatar_path of one login: objects avatars/{profile_id}/avatar-*. 404 user_not_found. */
export function profileSlot(db: Db, profileId: string): AvatarSlot {
  return {
    owns: (path) => isUserAvatarPathOf(path, profileId),
    read: async () => {
      const { data, error } = await db.from('profiles').select('avatar_path').eq('id', profileId).maybeSingle();
      if (error) throw dbError(error);
      if (!data) throw notFound('user_not_found');
      return data.avatar_path;
    },
    write: async (path) => {
      const { error } = await db.from('profiles').update({ avatar_path: path }).eq('id', profileId);
      if (error) throw dbError(error);
    },
  };
}

/** teachers.avatar_path (migration 20261028000944): objects avatars/teachers/{teacher_id}/avatar-*. */
export function teacherSlot(db: Db, teacherId: string): AvatarSlot {
  return {
    owns: (path) => isTeacherAvatarPathOf(path, teacherId),
    read: async () => {
      const { data, error } = await db.from('teachers').select('avatar_path').eq('id', teacherId).maybeSingle();
      if (error) throw dbError(error);
      if (!data) throw notFound('teacher_not_found');
      return data.avatar_path;
    },
    write: async (path) => {
      const { error } = await db.from('teachers').update({ avatar_path: path }).eq('id', teacherId);
      if (error) throw dbError(error);
    },
  };
}
