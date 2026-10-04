import type { Tables } from '@ab/db';
import type { StudentUpdate } from '@ab/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { DB, type Db } from '../../common/db/db.module';
import { GuardiansService } from '../guardians/guardians.service';
import { dbError } from '../guardians/http';
import { detectDuplicates } from './duplicate-detector';
import { LeadLink } from './lead-link';
import type { StudentCreateRequest } from './students.dto';
import { toStudentInsert, toStudentPatch } from './students.mapper';

type Student = Tables<'students'>;

/** Students writes (R-STU-01..05). Reads live in students.queries.ts. */
@Injectable()
export class StudentsService {
  private readonly leadLink: LeadLink;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly guardians: GuardiansService,
    private readonly audit: AuditService,
  ) {
    this.leadLink = new LeadLink(db, audit);
  }

  /** 409 `duplicate_student` + candidates unless `force` (R-STU-03); `lead_id` → 404 before any write. */
  async create(dto: StudentCreateRequest, actorId: string): Promise<Student> {
    const lead = dto.lead_id ? await this.leadLink.find(dto.lead_id) : null;
    const guardianId = await this.resolveGuardian(dto, actorId);
    if (!dto.force) {
      const { students } = await this.guardians.get(guardianId);
      const candidates = detectDuplicates(dto.name, students);
      if (candidates.length > 0) {
        throw new ConflictException({ message: 'duplicate_student', guardian_id: guardianId, candidates });
      }
    }
    const { data, error } = await this.db
      .from('students')
      .insert(toStudentInsert({ dto, guardianId, actorId }))
      .select()
      .single();
    if (error) throw dbError(error, 'guardian_not_found');
    if (lead) await this.leadLink.convert({ lead, guardianId, actorId });
    return data;
  }

  /** Existing guardian id, or the guardian with that phone, created if new (R-STU-04). */
  private async resolveGuardian(dto: StudentCreateRequest, actorId: string): Promise<string> {
    if (dto.guardian_id) return dto.guardian_id;
    if (!dto.guardian) throw new BadRequestException('guardian_id_or_guardian');
    const existing = await this.guardians.findByPhone(dto.guardian.phone_e164);
    return existing?.id ?? (await this.guardians.create(dto.guardian, actorId)).id;
  }

  /** Status changes are audited (R-NFR-03). */
  async update(id: string, dto: StudentUpdate, actorId: string): Promise<Student> {
    const before = await this.getRow(id);
    const { data, error } = await this.db
      .from('students')
      .update(toStudentPatch(dto))
      .eq('id', id)
      .select()
      .single();
    if (error) throw dbError(error);
    if (dto.status && dto.status !== before.status) {
      await this.audit.record({
        actorId,
        entity: 'students',
        entityId: id,
        action: 'status_change',
        before: { status: before.status },
        after: { status: dto.status },
      });
    }
    return data;
  }

  /** Hard delete (e.g. a typo row). 409 once anything references the student; keeps an audit copy. */
  async remove(id: string, actorId: string): Promise<void> {
    const { data, error } = await this.db.from('students').delete().eq('id', id).select();
    if (error) throw dbError(error, 'student_in_use');
    const [row] = data;
    if (!row) throw new NotFoundException();
    await this.audit.record({ actorId, entity: 'students', entityId: id, action: 'delete', before: row });
  }

  private async getRow(id: string): Promise<Student> {
    const { data, error } = await this.db.from('students').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw new NotFoundException();
    return data;
  }
}
