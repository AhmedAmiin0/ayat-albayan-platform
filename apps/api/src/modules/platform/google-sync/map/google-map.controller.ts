import {
  googleMapRoutes as routes,
  type GoogleStudentMapRow,
  type GoogleTeacherMapRow,
  type TeacherCalendarView,
} from '@ab/catalog';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { AdminUser, requireAdmin } from '@/modules/platform/google-sync/admin/admin-only';
import type { AuthUser } from '@/common/auth/verify-token';
import { CurrentUser } from '@/common/auth/decorators';
import { GoogleMapService } from './google-map.service';
import { TeacherCalendarService } from './teacher-calendar.service';

const SEARCH_MAX = 80;

/** Teacher ↔ calendar and student ↔ folder mappings, confirmed by an admin (docs/24 §3). */
@ApiBearerAuth()
@Controller()
export class GoogleMapController {
  constructor(
    private readonly map: GoogleMapService,
    private readonly calendars: TeacherCalendarService,
  ) {}

  @Route(routes.teachers)
  async teachers(@CurrentUser() user: AuthUser): Promise<GoogleTeacherMapRow[]> {
    requireAdmin(user);
    return asResponse(routes.teachers.response, await this.map.teachers());
  }

  @Route(routes.setTeacher)
  async setTeacher(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.setTeacher>,
    @AdminUser() user: AuthUser,
  ): Promise<GoogleTeacherMapRow[]> {
    const input = { teacherId: params.id, calendarId: body.calendar_id, actorId: user.id };
    await this.map.setTeacher(input);
    return asResponse(routes.setTeacher.response, await this.map.teachers());
  }

  @Route(routes.calendarOwner)
  async calendarOwner(
    @RouteInput() { params }: RouteInputOf<typeof routes.calendarOwner>,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherCalendarView> {
    requireAdmin(user);
    return asResponse(routes.calendarOwner.response, await this.calendars.view(params.id));
  }

  @Route(routes.setCalendarOwner)
  async setCalendarOwner(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.setCalendarOwner>,
    @AdminUser() user: AuthUser,
  ): Promise<TeacherCalendarView> {
    const input = { teacherId: params.id, owner: body.owner, actorId: user.id };
    return asResponse(routes.setCalendarOwner.response, await this.calendars.setOwner(input));
  }

  @Route(routes.students)
  async students(
    @RouteInput() { query }: RouteInputOf<typeof routes.students>,
    @CurrentUser() user: AuthUser,
  ): Promise<GoogleStudentMapRow[]> {
    requireAdmin(user);
    const rows = await this.map.students((query.q ?? '').slice(0, SEARCH_MAX));
    return asResponse(routes.students.response, rows);
  }

  @Route(routes.setStudent)
  async setStudent(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.setStudent>,
    @AdminUser() user: AuthUser,
  ): Promise<GoogleStudentMapRow> {
    const row = await this.map.setStudent({ studentId: params.id, files: body, actorId: user.id });
    return asResponse(routes.setStudent.response, row);
  }

  @Route(routes.unsetStudent)
  async unsetStudent(
    @RouteInput() { params }: RouteInputOf<typeof routes.unsetStudent>,
    @AdminUser() user: AuthUser,
  ): Promise<GoogleStudentMapRow> {
    const row = await this.map.setStudent({ studentId: params.id, files: null, actorId: user.id });
    return asResponse(routes.unsetStudent.response, row);
  }
}
