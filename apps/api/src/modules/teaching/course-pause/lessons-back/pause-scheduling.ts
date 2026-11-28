import { Injectable } from '@nestjs/common';
import {
  OccurrenceGenerator,
  ScheduleRepo,
  SchedulingSettings,
} from '@/modules/teaching/scheduling';

/** What generating a resumed rule again needs (max-params). */
@Injectable()
export class PauseScheduling {
  constructor(
    readonly rules: ScheduleRepo,
    readonly generator: OccurrenceGenerator,
    readonly settings: SchedulingSettings,
  ) {}
}
