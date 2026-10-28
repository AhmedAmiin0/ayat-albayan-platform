import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability/availability.controller';
import { AvailabilityQueries } from './availability/availability.queries';
import { AvailabilityQuery } from './availability/availability.query';
import { TeachersController } from './teachers.controller';
import { TeacherUsernames } from './teacher-username';
import { TeachersQueries } from './teachers.queries';
import { TeachersSettings } from './teachers.settings';

/** Teachers, weekly availability, time-off, free-slot query. R-TCH-01, R-TCH-02. */
@Module({
  controllers: [TeachersController, AvailabilityController],
  providers: [TeachersSettings, TeachersQueries, TeacherUsernames, AvailabilityQueries, AvailabilityQuery],
  exports: [AvailabilityQueries, AvailabilityQuery, TeachersQueries],
})
export class TeachersModule {}
