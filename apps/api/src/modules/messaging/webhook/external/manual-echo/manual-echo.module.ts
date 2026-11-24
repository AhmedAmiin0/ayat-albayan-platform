import { Module } from '@nestjs/common';
import { ManualEchoRepo } from './manual-echo.repo';
import { ManualEcho } from './manual-echo.service';

/** An echo of a message staff sent outside the app, matched to the chat row they tapped. */
@Module({
  providers: [ManualEcho, ManualEchoRepo],
  exports: [ManualEcho],
})
export class ManualEchoModule {}
