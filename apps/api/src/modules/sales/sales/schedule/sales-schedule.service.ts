import type { SalesScheduleDay, SalesScheduleQuery, SalesTeacherView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { toSalesTeacher } from '@/modules/sales/sales/academy/sales-academy.mapper';
import { SalesAcademyRepo } from '@/modules/sales/sales/academy/sales-academy.repo';
import {
  nextLessons,
  riyadhDayRange,
  riyadhToday,
  teacherDayFacts,
  toScheduleLesson,
  upcomingRange,
} from './sales-schedule.mapper';
import { SalesScheduleRepo } from './sales-schedule.repo';
import { SalesSettings } from '@/modules/sales/sales/shared';

/**
 * The salesperson's view of the teachers and the academy's day: a clear teacher list and the
 * schedule. Read-only, whitelisted.
 */
@Injectable()
export class SalesScheduleService {
  constructor(
    private readonly academy: SalesAcademyRepo,
    private readonly schedule: SalesScheduleRepo,
    private readonly settings: SalesSettings,
  ) {}

  async teachers(now = new Date()): Promise<SalesTeacherView[]> {
    const [rows, today, upcoming, settings] = await Promise.all([
      this.academy.teachers(),
      this.schedule.day(riyadhDayRange(riyadhToday(now))),
      this.schedule.upcoming(upcomingRange(now)),
      this.settings.read(),
    ]);
    const ctx = {
      facts: teacherDayFacts(today, now),
      next: nextLessons(upcoming),
      academyAuto: settings.meeting_link_auto,
    };
    return rows.map((row) => toSalesTeacher(row, ctx));
  }

  /** One Riyadh day, today by default. */
  async day(q: SalesScheduleQuery, now = new Date()): Promise<SalesScheduleDay> {
    const date = q.date ?? riyadhToday(now);
    const [rows, settings] = await Promise.all([
      this.schedule.day({ ...riyadhDayRange(date), teacherId: q.teacherId }),
      this.settings.read(),
    ]);
    return { date, lessons: rows.map((row) => toScheduleLesson(row, settings.meeting_link_auto)) };
  }
}
