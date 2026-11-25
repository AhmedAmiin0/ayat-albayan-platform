import { Module } from '@nestjs/common';
import { InboxSharedModule } from '@/modules/messaging/inbox/inbox-shared.module';
import { GifService } from './gif.service';
import { StickerRepo } from './sticker.repo';
import { StickersController } from './stickers.controller';
import { StickersService } from './stickers.service';

@Module({
  imports: [InboxSharedModule],
  controllers: [StickersController],
  providers: [StickerRepo, StickersService, GifService],
})
export class StickersModule {}
