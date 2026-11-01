import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { studentColumnQueryShape, studentListFiltersSchema } from '@ab/shared';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { DB, type Db } from '@/common/db/db.module';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { blanksToNull, listQuerySchema } from '@/modules/people/guardians/http';
import { MergeService } from './merge.service';
import { mergeRequestSchema, studentCreateRequestSchema, studentPatchSchema } from './students.dto';
import {
  countStudentsByStatus,
  getStudentProfile,
  listStudents,
  listTeacherOptions,
} from './students.repo';
import { StudentsService } from './students.service';

const Uuid = new ParseUUIDPipe();
/**
 * Search + paging + filters (R-STU-01): ?status=trial,active&teacher=<id>|none&program=&package=&weekly=&tz=,
 * column text filters ?code=&name=&guardian= and ?sort=&dir= (R-NFR-08).
 */
const studentListQuerySchema = listQuerySchema.extend({
  ...studentListFiltersSchema.shape,
  ...studentColumnQueryShape,
});
const createBody = blanksToNull(studentCreateRequestSchema);
const patchBody = blanksToNull(studentPatchSchema);

/** Admin-only students CRUD + merge (R-STU-01..05). */
@ApiTags('students')
@ApiBearerAuth()
@Permissions('students.read')
@Controller('students')
export class StudentsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly students: StudentsService,
    private readonly merges: MergeService,
  ) {}

  @Get()
  list(@ZodQuery(studentListQuerySchema) query: z.output<typeof studentListQuerySchema>) {
    return listStudents(this.db, query);
  }

  /** Students per status under the same filters (the teacher profile's header counts). */
  @Get('status-counts')
  statusCounts(
    @ZodQuery(studentListFiltersSchema) query: z.output<typeof studentListFiltersSchema>,
  ) {
    return countStudentsByStatus(this.db, query);
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
  @Permissions('students.write')
  create(@ZodBody(createBody) body: z.output<typeof createBody>, @CurrentUser() user: AuthUser) {
    return this.students.create(body, user.id);
  }

  @Patch(':id')
  @Permissions('students.write')
  update(
    @Param('id', Uuid) id: string,
    @ZodBody(patchBody) body: z.output<typeof patchBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.students.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @Permissions('students.write')
  remove(@Param('id', Uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.students.remove(id, user.id);
  }

  /** Folds `merged_id` into `:id`, which is kept (R-STU-03). */
  @Post(':id/merge')
  @Permissions('students.write')
  merge(
    @Param('id', Uuid) id: string,
    @ZodBody(mergeRequestSchema) body: z.output<typeof mergeRequestSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const { merged_id } = body;
    return this.merges.merge({ keptId: id, mergedId: merged_id, actorId: user.id });
  }
}
