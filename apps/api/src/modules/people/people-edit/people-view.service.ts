import type { PeopleEditView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { toEditView } from './people-edit.mapper';
import { PeopleEditRepo } from './people-edit.repo';
import { StudentRecordsRepo } from './student-records.repo';

/**
 * GET /people/students/:id: the student, the family and two facts the clients need so they never
 * offer an action the API refuses (a login of the student or the family, any history).
 */
@Injectable()
export class PeopleViewService {
  constructor(
    private readonly repo: PeopleEditRepo,
    private readonly records: StudentRecordsRepo,
  ) {}

  async view(id: string): Promise<PeopleEditView> {
    const row = await this.repo.view(id);
    if (!row?.guardian) throw notFound('student_not_found');
    const tables = await this.records.records(id);
    return toEditView(row, { family: row.guardian, hasRecords: tables.length > 0 });
  }
}
