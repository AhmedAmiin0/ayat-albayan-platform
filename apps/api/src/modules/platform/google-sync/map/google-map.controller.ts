import { googleStudentMapSchema, googleTeacherMapSchema, teacherCalendarOwnerSchema, type GoogleStudentMapRow, type GoogleTeacherMapRow, type TeacherCalendarView } from '@ab/shared';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { requireAdmin } from '../admin/admin-only';
import { GoogleMapService } from './google-map.service';
import { TeacherCalendarService } from './teacher-calendar.service';

/** Teacher ↔ calendar and student ↔ folder mappings, confirmed by an admin (docs/24 §3). */
@ApiTags('google-sync')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('admin/google')
export class GoogleMapController {
  constructor(
    private readonly map: GoogleMapService,
    private readonly calendars: TeacherCalendarService,
  ) {}

  @Get('teachers')
  @Permissions('settings.read')
  teachers(@CurrentUser() user: AuthUser): Promise<GoogleTeacherMapRow[]> {
    requireAdmin(user);
    return this.map.teachers();
  }

  @Put('teachers/:id')
  async setTeacher(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<GoogleTeacherMapRow[]> {
    requireAdmin(user);
    const { calendar_id } = parseOrThrow(googleTeacherMapSchema, body);
    await this.map.setTeacher({ teacherId: id, calendarId: calendar_id, actorId: user.id });
    return this.map.teachers();
  }

  /** «تقويم المعلم»: who builds the teacher's calendar (script / platform) and how its events fare. */
  @Get('teachers/:id/calendar-owner')
  @Permissions('settings.read')
  calendarOwner(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<TeacherCalendarView> {
    requireAdmin(user);
    return this.calendars.view(id);
  }

  @Put('teachers/:id/calendar-owner')
  setCalendarOwner(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TeacherCalendarView> {
    requireAdmin(user);
    const { owner } = parseOrThrow(teacherCalendarOwnerSchema, body);
    return this.calendars.setOwner({ teacherId: id, owner, actorId: user.id });
  }

  @Get('students')
  @Permissions('settings.read')
  students(@Query('q') q: string | undefined, @CurrentUser() user: AuthUser): Promise<GoogleStudentMapRow[]> {
    requireAdmin(user);
    return this.map.students((q ?? '').slice(0, 80));
  }

  @Put('students/:id')
  setStudent(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<GoogleStudentMapRow> {
    requireAdmin(user);
    return this.map.setStudent({ studentId: id, files: parseOrThrow(googleStudentMapSchema, body), actorId: user.id });
  }

  @Delete('students/:id')
  unsetStudent(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<GoogleStudentMapRow> {
    requireAdmin(user);
    return this.map.setStudent({ studentId: id, files: null, actorId: user.id });
  }
}
