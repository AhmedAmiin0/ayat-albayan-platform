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
  ['guest join', ClassroomPublicController, 'join', lessonJoinRoutes.guestJoin],
  ['meeting view', InternalMeetingsPublicController, 'view', meetingRoomRoutes.publicView],
  ['meeting guest join', InternalMeetingsPublicController, 'join', meetingRoomRoutes.guestJoin],
  ['student link', StudentLinkPublicController, 'view', lessonRoomRoutes.studentLink],
  ['student join', StudentLinkPublicController, 'join', lessonRoomRoutes.studentJoin],
  ['livekit webhook', LivekitWebhookController, 'receive', livekitWebhookRoutes.receive],
] as const;

describe('classroom doors with no login: public through their route objects', () => {
  it.each(doors)('%s serves its route and is public from it alone', (_name, cls, key, route) => {
    const handler: object = Object(Reflect.get(cls.prototype, key));
    expect(routeOf(handler)).toBe(route);
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBe(true);
    expect(Reflect.getMetadata(OWN_PUBLIC, handler)).toBeUndefined();
    expect(Reflect.getMetadata(OWN_PUBLIC, cls)).toBeUndefined();
  });
});
