import { Module } from '@nestjs/common';
import { SavedRepliesController } from './saved-replies.controller';
import { SavedReplyFiles } from './saved-replies.files';
import { SavedRepliesRepo } from './saved-replies.repo';
import { SavedRepliesService } from './saved-replies.service';
import { SavedReplySettings } from './saved-replies.settings';

/** «الردود السريعة» saved replies (owner 2026-10-25). StorageModule and SettingsModule are global. */
@Module({
  controllers: [SavedRepliesController],
  providers: [SavedRepliesRepo, SavedRepliesService, SavedReplyFiles, SavedReplySettings],
})
export class SavedRepliesModule {}
