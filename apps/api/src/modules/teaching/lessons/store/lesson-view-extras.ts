import { Injectable } from '@nestjs/common';
import { StaffPhotos } from '@/common/storage/avatars/staff-photos';
import { LessonRoomStates } from '@/modules/teaching/classroom';
import { AutoHeldRepo } from '@/modules/teaching/lessons/auto-held/auto-held.repo';

/**
 * What LessonViews adds to the rows (one injectable, so its constructor stays at ≤ 4 params): the
 * teacher's photo, «تصحيح» of a settled lesson, and the live room (who is inside, ended for all).
 */
@Injectable()
export class LessonViewExtras {
  constructor(
    readonly photos: StaffPhotos,
    readonly autoHeld: AutoHeldRepo,
    readonly rooms: LessonRoomStates,
  ) {}
}
