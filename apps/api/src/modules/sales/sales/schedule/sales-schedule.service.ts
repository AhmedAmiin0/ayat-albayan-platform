import type { SalesScheduleDay, SalesScheduleQuery, SalesTeacherView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { toSalesTeacher } from '../academy/sales-academy.mapper';
import { SalesAcademyQueries } from '../academy/sales-academy.queries';
import { nextLessons, riyadhDayRange, riyadhToday, teacherDayFacts, toScheduleLesson, upcomingRange } from './sales-schedule.mapper';
import { SalesScheduleQueries } from './sales-schedule.queries';
import { SalesSettings } from '../sales.settings';

/**
 * The salesperson's view of the teachers and the academy's day (owner report 2026-10-12: «listing all
 * the teachers in a really bad way», «not seeing the schedule»). Read-only, whitelisted.
 */
@Injectable()
export class SalesScheduleService {
  constructor(
    private readonly academy: SalesAcademyQueries,
    private readonly schedule: SalesScheduleQueries,
    private readonly settings: SalesSettings,
  ) {}

  /** «المعلمون»: each active teacher with today's lessons, «في حلقة الآن» and their students' next lesson. */
  async teachers(now = new Date()): Promise<SalesTeacherView[]> {
    const [rows, today, upcoming, settings] = await Promise.all([
      this.academy.teachers(),
      this.schedule.day(riyadhDayRange(riyadhToday(now))),
      this.schedule.upcoming(upcomingRange(now)),
      this.settings.read(),
    ]);
    const ctx = { facts: teacherDayFacts(today, now), next: nextLessons(upcoming), academyAuto: settings.meeting_link_auto };
    return rows.map((row) => toSalesTeacher(row, ctx));
  }

  /** «الجدول»: one Riyadh day (today by default), optionally one teacher's. */
  async day(q: SalesScheduleQuery, now = new Date()): Promise<SalesScheduleDay> {
    const date = q.date ?? riyadhToday(now);
    const [rows, settings] = await Promise.all([
      this.schedule.day({ ...riyadhDayRange(date), teacherId: q.teacherId }),
      this.settings.read(),
    ]);
    return { date, lessons: rows.map((row) => toScheduleLesson(row, settings.meeting_link_auto)) };
  }
}
