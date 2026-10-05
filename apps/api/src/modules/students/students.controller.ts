import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { studentColumnQueryShape, studentListFiltersSchema } from '@ab/shared';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { DB, type Db } from '../../common/db/db.module';
import { blankToNull, listQuerySchema, parse } from '../guardians/http';
import { MergeService } from './merge.service';
import { mergeRequestSchema, studentCreateRequestSchema, studentPatchSchema } from './students.dto';
import { countStudentsByStatus, getStudentProfile, listStudents, listTeacherOptions } from './students.queries';
import { StudentsService } from './students.service';

const Uuid = new ParseUUIDPipe();
/**
 * Search + paging + filters (R-STU-01): ?status=trial,active&teacher=<id>|none&program=&package=&weekly=&tz=,
 * column text filters ?code=&name=&guardian= and ?sort=&dir= (R-NFR-08).
 */
const studentListQuerySchema = listQuerySchema.extend({ ...studentListFiltersSchema.shape, ...studentColumnQueryShape });

/** Admin-only students CRUD + merge (R-STU-01..05). */
@ApiTags('students')
@ApiBearerAuth()
@Roles('admin')
@Controller('students')
export class StudentsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly students: StudentsService,
    private readonly merges: MergeService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return listStudents(this.db, parse(studentListQuerySchema, query));
  }

  /** Students per status under the same filters (the teacher profile's header counts). */
  @Get('status-counts')
  statusCounts(@Query() query: unknown) {
    return countStudentsByStatus(this.db, parse(studentListFiltersSchema, query));
  }

  @Get('teacher-options')
  teacherOptions() {
    return listTeacherOptions(this.db);
  }

  @Get(':id')
  get(@Param('id', Uuid) id: string) {
    return getStudentProfile(this.db, id);
  }

  /** 409 `{ message: 'duplicate_student', candidates }` unless `force: true` (R-STU-03). */
  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.students.create(parse(studentCreateRequestSchema, blankToNull(body)), user.id);
  }

  @Patch(':id')
  update(@Param('id', Uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.students.update(id, parse(studentPatchSchema, blankToNull(body)), user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', Uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.students.remove(id, user.id);
  }

  /** Folds `merged_id` into `:id`, which is kept (R-STU-03). */
  @Post(':id/merge')
  merge(@Param('id', Uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { merged_id } = parse(mergeRequestSchema, body);
    return this.merges.merge({ keptId: id, mergedId: merged_id, actorId: user.id });
  }
}
