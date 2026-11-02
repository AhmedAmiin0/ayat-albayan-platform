import type { FamilyMove, FamilyOption } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, notFound } from '@/common/http/errors';
import { GuardiansService } from '@/modules/people/guardians';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditRepo } from './people-edit.repo';

export interface MoveInput {
  studentId: string;
  move: FamilyMove;
  actorId: string;
}

/** The family a move goes to: its id, and whether this move created it. */
interface Target {
  id: string;
  created: boolean;
}

type Existing = Extract<FamilyMove, { kind: 'existing' }>;
type Fresh = Extract<FamilyMove, { kind: 'new' }>;

/**
 * «ربط الطالب بولي أمر» (owner 2026-11-02): the student moves to another family =
 * students.guardian_id, and nothing else. Packages, lessons, payments, reports, attendance and
 * the student's channel are keyed by the student, so they move with it. The old family's chats and
 * calls stay with the number they came from (messages, wa_calls and lesson_feedback keep their
 * guardian_id as history), and the old family stays, even empty. «مشترك» follows by trigger
 * (students_chat_list_auto_upd). contact_is_self is cleared: the new family's number is not the
 * student's own. Compare-and-set on the old family (409 guardian_changed), one audit row
 * ('guardian_change'). A new family is found by its main phone first (as POST /students).
 */
@Injectable()
export class FamilyMoveService {
  constructor(
    private readonly repo: PeopleEditRepo,
    private readonly search: FamilySearchRepo,
    private readonly guardians: GuardiansService,
    private readonly audit: AuditService,
  ) {}

  families(term: string): Promise<FamilyOption[]> {
    return this.search.search(term);
  }

  async move({ studentId, move, actorId }: MoveInput) {
    const student = await this.repo.student(studentId);
    if (!student) throw notFound('student_not_found');
    const target = await this.target(move, actorId);
    if (target.id === student.guardian_id) throw conflict('same_guardian');
    const row = { id: studentId, from: student.guardian_id, to: target.id };
    const moved = await this.repo.move(row);
    if (!moved) throw conflict('guardian_changed');
    await this.audit.record({
      actorId,
      entity: 'students',
      entityId: studentId,
      action: 'guardian_change',
      before: { guardian_id: student.guardian_id, contact_is_self: student.contact_is_self },
      after: { guardian_id: target.id, contact_is_self: false, guardian_created: target.created },
    });
    return { student_id: studentId, guardian_id: target.id };
  }

  private target(move: FamilyMove, actorId: string): Promise<Target> {
    return move.kind === 'existing' ? this.existing(move) : this.findOrCreate(move, actorId);
  }

  private async existing(move: Existing): Promise<Target> {
    const row = await this.repo.guardian(move.id);
    if (!row) throw notFound('guardian_not_found');
    return { id: row.id, created: false };
  }

  private async findOrCreate({ guardian }: Fresh, actorId: string): Promise<Target> {
    const found = await this.guardians.findByPhone(guardian.phone_e164);
    if (found) return { id: found.id, created: false };
    const dto = { ...guardian, notes: null, source: null };
    const fresh = await this.guardians.create(dto, actorId).catch((e: unknown) => {
      throw e instanceof ConflictException ? conflict('phone_taken') : e;
    });
    return { id: fresh.id, created: true };
  }
}
