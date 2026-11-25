import type { Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type {
  FamilyLogin,
  GuardianRec,
  StudentRec,
} from '@/modules/people/sign-in/sign-in.ports';

// The family side of SubjectStore: every family number is a guardian_phones row
// (its key is the phone, so one number names one account): the main one, a second one, or a
// student's own (student_id). A student's own number opens the student's login, any other the
// guardian's. The code goes to the matched number; GuardianRec.phone stays the MAIN number.

const FAMILY = [
  'phone_e164, guardian:guardians!inner(id, name, phone_e164, tz, profile_id)',
  'student:students!guardian_phones_student_id_fkey(id, name, tz, profile_id)',
].join(', ');

interface FamilyRow {
  id: string;
  name: string;
  phone_e164: string;
  tz: string;
  profile_id: string | null;
}

type ChildRow = Omit<FamilyRow, 'phone_e164'>;

interface NumberRow {
  phone_e164: string;
  guardian: FamilyRow;
  student: ChildRow | null;
}

const toGuardian = (g: FamilyRow): GuardianRec => ({
  id: g.id,
  name: g.name,
  phone: g.phone_e164,
  tz: g.tz,
  profileId: g.profile_id,
});

const toStudent = (s: ChildRow, guardianPhone: string): StudentRec => ({
  id: s.id,
  name: s.name,
  tz: s.tz,
  profileId: s.profile_id,
  guardianPhone,
});

const toLogin = ({ phone_e164: phone, guardian, student }: NumberRow): FamilyLogin =>
  student
    ? { kind: 'student', phone, rec: toStudent(student, guardian.phone_e164) }
    : { kind: 'guardian', phone, rec: toGuardian(guardian) };

/** The account a typed number names, or null (not a family number). */
export async function familyByPhone(db: Db, phone: string): Promise<FamilyLogin | null> {
  const query = db.from('guardian_phones').select(FAMILY).eq('phone_e164', phone);
  const { data, error } = await query.maybeSingle<NumberRow>();
  if (error) throw dbError(error);
  return data ? toLogin(data) : null;
}
