import {
  teacherLinkFileRoutes as routes,
  type ReportAttachmentView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';
import { Public } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TeacherLinkFiles } from './teacher-link.files';
import { TeacherLinkLimit } from './teacher-link.limit';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * The teacher's attachments on the no-login report page: ask for an upload
 * URL, PUT the file to Storage, register it; remove one; open one. Adding and removing close with
 * the edit window (409 edit_window_closed). Same link errors as the form (404 / 410 / 409 / 429).
 */
@Public()
@UseGuards(TeacherLinkLimit)
@Controller()
export class TeacherLinkFilesController {
  constructor(private readonly files: TeacherLinkFiles) {}

  @Route(routes.uploadUrl)
  @HttpCode(200)
  uploadUrl(@RouteInput() { params, body }: Input<'uploadUrl'>): Promise<SignedUpload> {
    return this.files.uploadUrl({ token: params.token, reportId: params.id, file: body });
  }

  @Route(routes.register)
  register(@RouteInput() { params, body }: Input<'register'>): Promise<ReportAttachmentView> {
    return this.files.register({ token: params.token, reportId: params.id, file: body });
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(@RouteInput() { params }: Input<'remove'>): Promise<void> {
    const { token, id, attachmentId } = params;
    return this.files.remove({ token, reportId: id, attachmentId });
  }

  @Route(routes.url)
  url(@RouteInput() { params }: Input<'url'>): Promise<SignedDownload> {
    const { token, id, attachmentId } = params;
    return this.files.url({ token, reportId: id, attachmentId });
  }
}
