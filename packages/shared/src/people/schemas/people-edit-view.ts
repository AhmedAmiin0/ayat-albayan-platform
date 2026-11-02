import type { Gender } from '@ab/catalog';

// GET /people/students/:id (people.edit): what «تعديل البيانات», «ربط بولي أمر آخر» and «تحويل»
// need, on web and mobile, for the assistant and the admin alike. Phones are E.164 (rule 7).

export interface PeopleEditStudent {
  id: string;
  /** Generated (AB-nnnn), never typed; null only in the generated column's type. */
  code: string | null;
  name: string;
  age: number | null;
  gender: Gender | null;
  level: string | null;
  memorized: string | null;
  goal: string | null;
  riwaya: string | null;
  tz: string;
  notes: string | null;
  teacher_gender_pref: Gender | null;
  contact_is_self: boolean;
  /** A login (students.code + password) is linked: «تحويل إلى ولي أمر» is refused. */
  has_login: boolean;
}

export interface PeopleEditFamilyPhone {
  phone_e164: string;
  is_primary: boolean;
}

export interface PeopleEditFamily {
  id: string;
  name: string;
  phone_e164: string;
  country: string | null;
  tz: string;
  notes: string | null;
  phones: PeopleEditFamilyPhone[];
  /** Every child of the family, this student included. */
  students: { id: string; code: string | null; name: string; contact_is_self: boolean }[];
}

export interface PeopleEditView {
  student: PeopleEditStudent;
  guardian: PeopleEditFamily;
}

/** One row of the guardian picker (GET /people/guardians?search=). */
export interface FamilyOption {
  id: string;
  name: string;
  phone_e164: string;
  students: { code: string | null; name: string }[];
}

/** POST /people/guardians/:id/to-student: the new student row of that family. */
export interface ConvertedStudent {
  id: string;
  code: string | null;
}
