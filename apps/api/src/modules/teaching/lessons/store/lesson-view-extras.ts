import { Inject, Injectable } from '@nestjs/common';
import { StaffPhotos } from '@/common/storage/avatars/staff-photos';
import { LessonRoomStates } from '@/modules/teaching/lessons/live-room/lesson-room-states';
import { AutoHeldRepo } from '@/modules/teaching/lessons/auto-held/auto-held.repo';

/** One injectable so LessonViews keeps its constructor at 4 params or fewer. */
@Injectable()
export class LessonViewExtras {
  constructor(
    @Inject(StaffPhotos) readonly photos: StaffPhotos,
    @Inject(AutoHeldRepo) readonly autoHeld: AutoHeldRepo,
    @Inject(LessonRoomStates) readonly rooms: LessonRoomStates,
  ) {}
}
