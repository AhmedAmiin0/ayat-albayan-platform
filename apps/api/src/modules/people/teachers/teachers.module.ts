import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability/availability.controller';
import { AvailabilityRepo } from './availability/availability.repo';
import { AvailabilityQuery } from './availability/availability.query';
import { TeachersController } from './teachers.controller';
import { TeacherUsernames } from './teacher-username';
import { TeachersRepo } from './teachers.repo';
import { TeachersSettings } from './teachers.settings';

/** Teachers, weekly availability, time-off, free-slot query. R-TCH-01, R-TCH-02. */
@Module({
  controllers: [TeachersController, AvailabilityController],
  providers: [TeachersSettings, TeachersRepo, TeacherUsernames, AvailabilityRepo, AvailabilityQuery],
  exports: [AvailabilityRepo, AvailabilityQuery, TeachersRepo],
})
export class TeachersModule {}
