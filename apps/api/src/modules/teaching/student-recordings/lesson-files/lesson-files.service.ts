import type {
  LessonFileRegister,
  LessonFileUpload,
  LessonFileView,
  SignedDownload,
  SignedUpload,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, notFound } from '@/common/http/errors';
import { BUCKETS, isPathOf } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { LessonFilesAccess } from './lesson-files.access';
import { lessonFileKey, lessonFileView } from './lesson-files.mapper';
import { LessonFilesRepo, type LessonFileRow } from './lesson-files.repo';

interface FileCall {
  user: AuthUser;
  id: string;
}

/** The same signed-upload flow as report attachments, registered on the lesson. */
@Injectable()
export class LessonFilesService {
  constructor(
    @Inject(LessonFilesAccess) private readonly access: LessonFilesAccess,
    @Inject(LessonFilesRepo) private readonly files: LessonFilesRepo,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** A one-off upload URL; the bucket and the schema hold the type and the 25 MiB cap. */
  async uploadUrl(input: FileCall & { file: LessonFileUpload }): Promise<SignedUpload> {
    await this.access.lesson(input.user, input.id);
    const path = lessonFileKey({ lessonId: input.id, mime: input.file.mime });
    return this.storage.signedUpload({ bucket: BUCKETS.attachments, path, file: input.file });
  }

  /** 400 lesson_file_path unless the object sits under this lesson and was uploaded. */
  async register(input: FileCall & { file: LessonFileRegister }): Promise<LessonFileView> {
    await this.access.lesson(input.user, input.id);
    const { file } = input;
    const there =
      isPathOf(file.path, input.id) &&
      (await this.storage.exists({ bucket: BUCKETS.attachments, path: file.path }));
    if (!there) throw badRequest('lesson_file_path');
    const row = await this.files.add({
      lesson_id: input.id,
      kind: file.kind,
      title: file.title ?? null,
      mime: file.mime,
      size: file.size,
      storage_path: file.path,
      visible_to_family: file.visible_to_family,
      created_by: input.user.id,
    });
    return lessonFileView(row);
  }

  async setVisible(input: FileCall & { visible: boolean }): Promise<LessonFileView> {
    const row = await this.owned(input);
    return lessonFileView(await this.files.setVisible(row.id, input.visible));
  }

  /** The object, then the row. */
  async remove(input: FileCall): Promise<void> {
    const row = await this.owned(input);
    await this.storage.remove({ bucket: BUCKETS.attachments, path: row.storage_path });
    await this.files.remove(row.id);
  }

  /** A 1-hour link to open or play the file. */
  async url(input: FileCall): Promise<SignedDownload> {
    const row = await this.owned(input);
    return this.storage.signedDownload({ bucket: BUCKETS.attachments, path: row.storage_path });
  }

  /** 404 lesson_file_not_found; the lesson's gate otherwise. */
  private async owned(input: FileCall): Promise<LessonFileRow> {
    const row = await this.files.byId(input.id);
    if (!row) throw notFound('lesson_file_not_found');
    await this.access.lesson(input.user, row.lesson_id);
    return row;
  }
}
