import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability/availability.controller';
import { AvailabilityQueries } from './availability/availability.queries';
import { AvailabilityQuery } from './availability/availability.query';
import { TeachersController } from './teachers.controller';
import { TeachersQueries } from './teachers.queries';

/** Teachers, weekly availability, time-off, free-slot query. R-TCH-01, R-TCH-02. */
@Module({
  controllers: [TeachersController, AvailabilityController],
  providers: [TeachersQueries, AvailabilityQueries, AvailabilityQuery],
  exports: [AvailabilityQuery, TeachersQueries],
})
export class TeachersModule {}
