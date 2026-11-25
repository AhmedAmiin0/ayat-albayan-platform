import { Module } from '@nestjs/common';
import { AssistantsController } from './assistants.controller';
import { AssistantLessonsRepo } from './assistants.lessons';
import { AssistantsRepo } from './assistants.repo';
import { AssistantsService } from './assistants.service';

@Module({
  controllers: [AssistantsController],
  providers: [AssistantsRepo, AssistantLessonsRepo, AssistantsService],
})
export class AssistantsModule {}
