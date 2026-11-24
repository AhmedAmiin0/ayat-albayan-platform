import { Module } from '@nestjs/common';
import { InboxSharedModule } from './inbox-shared.module';
import { PdfPreviewRepo } from './files/pdf/pdf-preview.repo';
import { PdfPreviewService } from './files/pdf/pdf-preview.service';
import { ThreadFileSendController } from './files/thread-file-send.controller';
import { ThreadFileSender } from './files/thread-file-send.service';
import { ThreadFileController } from './files/thread-file.controller';
import { ThreadForwardController } from './files/thread-forward.controller';
import { ThreadForwardService } from './files/thread-forward.service';
import { ThreadMediaController } from './files/thread-media.controller';
import { ThreadMediaService } from './files/thread-media.service';

/** A chat's files: download, PDF preview, send and forward; in the root as files/ is at its cap. */
@Module({
  imports: [InboxSharedModule],
  controllers: [
    ...[ThreadMediaController, ThreadFileController],
    ...[ThreadFileSendController, ThreadForwardController],
  ],
  providers: [
    ...[ThreadMediaService, PdfPreviewRepo, PdfPreviewService],
    ...[ThreadFileSender, ThreadForwardService],
  ],
})
export class ThreadFilesModule {}
