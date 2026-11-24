import { Module } from '@nestjs/common';
import { GoogleSyncCoreModule } from '@/modules/platform/google-sync/sync';
import { GoogleMapController } from './google-map.controller';
import { GoogleMapService } from './google-map.service';
import { TeacherCalendarService } from './teacher-calendar.service';

@Module({
  imports: [GoogleSyncCoreModule],
  controllers: [GoogleMapController],
  providers: [GoogleMapService, TeacherCalendarService],
})
export class GoogleMapModule {}
