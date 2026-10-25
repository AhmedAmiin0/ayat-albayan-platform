import type { StudentStatus } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n/i18n';
import { isStatusChanged, STUDENTS_KEY, studentQuery, updateStudent } from './api';
import { toProfileValues, toStudentPatch, type ProfileValues } from './profile-form';
import type { StudentProfile } from './types';

export type SaveProfileOptions = {
  student: StudentProfile;
  values: ProfileValues;
  /** The status the form loaded: sent as `expected_status` with a changed status. */
  loaded: StudentStatus;
  queryClient: QueryClient;
};

export type SaveProfileResult = {
  message: { ok: boolean; text: string };
  /** Saved: reload the whole form from the PATCH response. */
  saved?: ProfileValues;
  /** 409 `status_changed`: the student's current status, to show instead of the stale one. */
  current?: StudentStatus;
};

/** One profile save (R-STU-05): PATCH, then the form reloads from the answer or the fresh student. */
export async function saveProfile(o: SaveProfileOptions): Promise<SaveProfileResult> {
  const r = toStudentPatch(o.values, o.loaded);
  if (!r.ok) return { message: { ok: false, text: r.error } };
  try {
    const row = await updateStudent(o.student.id, r.patch);
    await o.queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    return { message: { ok: true, text: t.students.updated }, saved: toProfileValues({ ...o.student, ...row }) };
  } catch (error) {
    if (!isStatusChanged(error)) return { message: { ok: false, text: t.common.error } };
    await o.queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    const fresh = await o.queryClient.fetchQuery(studentQuery(o.student.id)).catch(() => null);
    return { message: { ok: false, text: t.students.statusChanged }, current: fresh?.status };
  }
}
