import { Inject, Injectable } from '@nestjs/common';
import {
  FamilyRequestService,
  LessonCancelService,
  LessonStatusService,
} from '@/modules/teaching/lessons';

/** The lesson services the family's buttons reuse (one injectable keeps the constructor small). */
@Injectable()
export class PortalActionDeps {
  constructor(
    @Inject(LessonStatusService) readonly status: LessonStatusService,
    @Inject(LessonCancelService) readonly cancels: LessonCancelService,
    @Inject(FamilyRequestService) readonly requests: FamilyRequestService,
  ) {}
}
