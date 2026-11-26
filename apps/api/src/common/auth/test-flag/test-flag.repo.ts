import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

const flagRow = z.object({ is_test: z.boolean() }).nullable();

/**
 * profiles.is_test / students.is_test (migration 20261117140100, docs/56): read by the server,
 * never sent by a client.
 */
@Injectable()
export class TestFlagRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The profile's flag; a missing profile is real. Throws on a failed read (fail closed). */
  async ofProfile(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('profiles').select('is_test').eq('id', id).maybeSingle();
    if (error) throw pgError(error);
    return flagRow.parse(data)?.is_test ?? false;
  }

  /** The student's flag; a missing student is real. */
  async ofStudent(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('students').select('is_test').eq('id', id).maybeSingle();
    if (error) throw pgError(error);
    return flagRow.parse(data)?.is_test ?? false;
  }

  /** true only when the lesson has students and every one of them is a test student. */
  async lessonAllTest(lessonId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select('student:students(is_test)')
      .eq('lesson_id', lessonId);
    if (error) throw pgError(error);
    const flags = data.map((r) => r.student.is_test);
    return flags.length > 0 && flags.every(Boolean);
  }
}
