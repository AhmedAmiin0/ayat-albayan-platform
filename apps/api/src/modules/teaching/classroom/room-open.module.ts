import { Module } from '@nestjs/common';
import { ClassroomSharedModule } from './classroom-shared.module';
import { RoomOpenController } from './join/room-open.controller';
import { RoomOpenService } from './join/room-open.service';

@Module({
  imports: [ClassroomSharedModule],
  controllers: [RoomOpenController],
  providers: [RoomOpenService],
})
export class RoomOpenModule {}
