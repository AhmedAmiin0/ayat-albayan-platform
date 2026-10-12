import type { SalesScheduleDay, SalesScheduleQuery, SalesTeacherView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { toSalesTeacher } from './sales-academy.mapper';
import { SalesAcademyQueries } from './sales-academy.queries';
import { nextLessons, riyadhDayRange, riyadhToday, teacherDayFacts, toScheduleLesson, upcomingRange } from './sales-schedule.mapper';
import { SalesScheduleQueries } from './sales-schedule.queries';

/**
 * The salesperson's view of the teachers and the academy's day (owner report 2026-10-12: «listing all
 * the teachers in a really bad way», «not seeing the schedule»). Read-only, whitelisted.
 */
@Injectable()
export class SalesScheduleService {
  constructor(
    private readonly academy: SalesAcademyQueries,
    private readonly schedule: SalesScheduleQueries,
  ) {}

  /** «المعلمون»: each active teacher with today's lessons, «في حلقة الآن» and their students' next lesson. */
  async teachers(now = new Date()): Promise<SalesTeacherView[]> {
    const [rows, today, upcoming] = await Promise.all([
      this.academy.teachers(),
      this.schedule.day(riyadhDayRange(riyadhToday(now))),
      this.schedule.upcoming(upcomingRange(now)),
    ]);
    const ctx = { facts: teacherDayFacts(today, now), next: nextLessons(upcoming) };
    return rows.map((row) => toSalesTeacher(row, ctx));
  }

  /** «الجدول»: one Riyadh day (today by default), optionally one teacher's. */
  async day(q: SalesScheduleQuery, now = new Date()): Promise<SalesScheduleDay> {
    const date = q.date ?? riyadhToday(now);
    const rows = await this.schedule.day({ ...riyadhDayRange(date), teacherId: q.teacherId });
    return { date, lessons: rows.map(toScheduleLesson) };
  }
}
