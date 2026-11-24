import type { FamilyMove, FamilyOption } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, notFound } from '@/common/http/errors';
import { GuardiansService } from '@/modules/people/guardians';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditRepo, type StudentRow } from './people-edit.repo';

/** The family a move goes to: its id, and whether this move created it. */
export interface MoveTarget {
  id: string;
  created: boolean;
}

interface MoveInput {
  studentId: string;
  move: FamilyMove;
  actorId: string;
  /**
   * Runs once the target is resolved, before anything is written: a «new» family whose number
   * already exists is that existing family, so the caller's ownership check sees its real id.
   */
  allowed: (target: MoveTarget) => Promise<void>;
}

type Existing = Extract<FamilyMove, { kind: 'existing' }>;
type Fresh = Extract<FamilyMove, { kind: 'new' }>;

/** Only guardian_id changes; history stays with the old family; compare-and-set, audited. */
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

  async move({ studentId, move, actorId, allowed }: MoveInput) {
    const student = await this.repo.student(studentId);
    if (!student) throw notFound('student_not_found');
    await this.assertMovable(student);
    const target = await this.target(move, actorId);
    if (target.id === student.guardian_id) throw conflict('same_guardian');
    await allowed(target);
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

  /** A student with a login, or a self learner whose family has one, is refused. */
  private async assertMovable(student: StudentRow): Promise<void> {
    if (student.profile_id) throw conflict('student_has_login');
    const family = student.contact_is_self ? await this.repo.guardian(student.guardian_id) : null;
    if (family?.profile_id) throw conflict('self_has_login');
  }

  private target(move: FamilyMove, actorId: string): Promise<MoveTarget> {
    return move.kind === 'existing' ? this.existing(move) : this.findOrCreate(move, actorId);
  }

  private async existing(move: Existing): Promise<MoveTarget> {
    const row = await this.repo.guardian(move.id);
    if (!row) throw notFound('guardian_not_found');
    return { id: row.id, created: false };
  }

  private async findOrCreate({ guardian }: Fresh, actorId: string): Promise<MoveTarget> {
    const found = await this.guardians.findByPhone(guardian.phone_e164);
    if (found) return { id: found.id, created: false };
    const dto = { ...guardian, notes: null, source: null };
    const fresh = await this.guardians.create(dto, actorId).catch((e: unknown) => {
      throw e instanceof ConflictException ? conflict('phone_taken') : e;
    });
    const after = { name: fresh.name, phone_e164: fresh.phone_e164, for_move: true };
    await this.audit.record({
      actorId,
      entity: 'guardians',
      entityId: fresh.id,
      action: 'create',
      after,
    });
    return { id: fresh.id, created: true };
  }
}
