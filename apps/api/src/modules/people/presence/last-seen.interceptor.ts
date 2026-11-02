import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { AuthUser } from '@/common/auth/verify-token';
import { LastSeenService } from './last-seen.service';

/**
 * Global: every request the AuthGuard let in with a user (any method) hands its user id to
 * LastSeenService, which throttles and queues (no I/O here). Public routes carry no user.
 */
@Injectable()
export class LastSeenInterceptor implements NestInterceptor {
  constructor(private readonly lastSeen: LastSeenService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() === 'http') {
      const id = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user?.id;
      if (id) this.lastSeen.seen(id);
    }
    return next.handle();
  }
}
