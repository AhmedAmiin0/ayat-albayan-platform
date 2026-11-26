import { linkKindSchema, type LinkKind } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import { badRequest, conflict } from '@/common/http/errors';
import type { UserStore } from '@/modules/people/users/store/users.store';
import type { RecordLink, RecordRequest } from './users.record-linker.types';

/** The record kind a base role's login belongs to (null = a staff role without one). */
export const linkKindOf = (role: UserRole): LinkKind | null =>
  linkKindSchema.safeParse(role).data ?? null;

/**
 * The teacher / student / guardian record of a login, shared by POST /users and PATCH /users/:id:
 * `assertLinkable` runs before the first write, `link` after the profile holds the new role.
 */
export class UserRecordLinker {
  constructor(private readonly store: UserStore) {}

  /** 400 link_target_not_found, 409 link_taken. */
  async assertLinkable(kind: LinkKind, request: RecordRequest): Promise<void> {
    if (!request.linked_id) return;
    const target = await this.store.linkTarget(kind, request.linked_id);
    if (!target) throw badRequest('link_target_not_found');
    if (target.hasLogin) throw conflict('link_taken');
  }

  async link(job: RecordLink): Promise<void> {
    const { new_teacher: teacher, linked_id: linkedId } = job.request;
    if (teacher) {
      await this.store.createTeacher({
        profile_id: job.profile.id,
        display_name_ar: teacher.display_name_ar,
        display_name_en: teacher.display_name_en ?? null,
        gender: teacher.gender,
        phone_e164: job.profile.phone_e164,
        tz: job.profile.tz,
      });
      return;
    }
    if (linkedId) await this.linkExisting({ ...job, linkedId });
  }

  /** 409 link_taken when somebody linked the record first. */
  private async linkExisting(job: RecordLink & { linkedId: string }): Promise<void> {
    const linked = await this.store.link(job.kind, job.linkedId, job.profile.id);
    if (!linked) throw conflict('link_taken');
    await this.copyTeacherPhone(job);
  }

  /** docs/46 A7: a teacher login left without a phone takes the record's (when nobody holds it). */
  private async copyTeacherPhone(job: RecordLink & { linkedId: string }): Promise<void> {
    const adopts = job.kind === 'teacher' && job.profile.phone_e164 === null;
    if (adopts) await this.store.adoptTeacherPhone(job.linkedId, job.profile.id);
  }
}
