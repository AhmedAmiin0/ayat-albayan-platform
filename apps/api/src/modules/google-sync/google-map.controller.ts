import { googleStudentMapSchema, googleTeacherMapSchema, type GoogleStudentMapRow, type GoogleTeacherMapRow } from '@ab/shared';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { requireAdmin } from './admin-only';
import { GoogleMapService } from './google-map.service';

/** Teacher ↔ calendar and student ↔ folder mappings, confirmed by an admin (docs/24 §3). */
@ApiTags('google-sync')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('admin/google')
export class GoogleMapController {
  constructor(private readonly map: GoogleMapService) {}

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
