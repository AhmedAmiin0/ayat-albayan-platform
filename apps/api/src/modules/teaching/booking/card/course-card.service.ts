import type { CourseCardView } from '@ab/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PackagesService } from '@/modules/finance/subscriptions';
import { ProfileCourseRepo } from '@/modules/teaching/booking/profile/profile-course.repo';
import { CourseCardCourse } from './course-card.course';
import { toCardPackage } from './course-card.mapper';

const EMPTY: CourseCardView = { subscriptionId: null, package: null, course: null, upcoming: [] };

/** A 404 (no package yet) is the empty card, never an error on the student's file. */
const orNull = (e: unknown): null => {
  if (e instanceof NotFoundException) return null;
  throw e;
};

/** Read only; the routes check the key. */
@Injectable()
export class CourseCards {
  constructor(
    @Inject(ProfileCourseRepo) private readonly profile: ProfileCourseRepo,
    @Inject(CourseCardCourse) private readonly course: CourseCardCourse,
    @Inject(PackagesService) private readonly packages: PackagesService,
  ) {}

  async card(studentId: string): Promise<CourseCardView> {
    const id = await this.profile.currentSubscription(studentId).catch(orNull);
    if (id === null) return EMPTY;
    const [course, balance] = await Promise.all([
      this.course.read({ subscriptionId: id, studentId }),
      this.packages.studentBalance(studentId),
    ]);
    return { subscriptionId: id, package: toCardPackage(balance, id), ...course };
  }
}
