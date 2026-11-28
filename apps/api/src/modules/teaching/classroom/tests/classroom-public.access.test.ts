import { lessonJoinRoutes, lessonRoomRoutes, meetingRoomRoutes } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { ClassroomPublicController } from '@/modules/teaching/classroom/classroom.public.controller';
import { InternalMeetingsPublicController } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.controller';
import { livekitWebhookRoutes } from '@/modules/teaching/classroom/livekit';
import { LivekitWebhookController } from '@/modules/teaching/classroom/livekit/livekit-webhook.controller';
import { StudentLinkPublicController } from '@/modules/teaching/classroom/student-link/student-link.controller';

const doors = [
  {
    name: 'guest join',
    cls: ClassroomPublicController,
    key: 'join',
    route: lessonJoinRoutes.guestJoin,
  },
  {
    name: 'meeting view',
    cls: InternalMeetingsPublicController,
    key: 'view',
    route: meetingRoomRoutes.publicView,
  },
  {
    name: 'meeting guest join',
    cls: InternalMeetingsPublicController,
    key: 'join',
    route: meetingRoomRoutes.guestJoin,
  },
  {
    name: 'student link',
    cls: StudentLinkPublicController,
    key: 'view',
    route: lessonRoomRoutes.studentLink,
  },
  {
    name: 'student join',
    cls: StudentLinkPublicController,
    key: 'join',
    route: lessonRoomRoutes.studentJoin,
  },
  {
    name: 'livekit webhook',
    cls: LivekitWebhookController,
    key: 'receive',
    route: livekitWebhookRoutes.receive,
  },
] as const;

describe('classroom doors with no login: public through their route objects', () => {
  it.each(doors)('$name serves its route and is public from it alone', ({ cls, key, route }) => {
    const handler: object = Object(Reflect.get(cls.prototype, key));
    expect(routeOf(handler)).toBe(route);
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBe(true);
    expect(Reflect.getMetadata(OWN_PUBLIC, handler)).toBeUndefined();
    expect(Reflect.getMetadata(OWN_PUBLIC, cls)).toBeUndefined();
  });
});
