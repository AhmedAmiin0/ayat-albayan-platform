import { withSql } from '../core/schedule';

// docs/46 A9: a teacher record with a phone and no login (the code goes to the record's phone, D2).
// Example data only; the code is read back from tools/wa-stub.

let teachers = 0;

/** An active teacher with a WhatsApp number on her record and no login yet. */
export async function codeTeacher(): Promise<{ id: string; phone: string }> {
  teachers += 1;
  const phone = `+9665${String(Date.now()).slice(-6)}${String(50 + (teachers % 50)).padStart(2, '0')}`;
  return withSql(async (sql) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.teachers (display_name_ar, gender, programs, tz, phone_e164)
      values ('معلمة الدخول برمز', 'female', '{quran}', 'Africa/Cairo', ${phone}) returning id`;
    if (!row) throw new Error('teacher not written');
    return { id: row.id, phone };
  });
}
