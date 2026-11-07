import { UPLOAD_CAPABILITY_HEADER } from '@ab/shared';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { withUploadClient } from './upload-client';

const HEADER = UPLOAD_CAPABILITY_HEADER.toLowerCase();

interface WithHeaders {
  headers?: Record<string, unknown>;
}

/**
 * Global: the handler (pipes included) runs inside the request's upload capability, so every
 * signed upload of this request knows whether its client can fill a MinIO slot (upload-client.ts).
 */
@Injectable()
export class UploadClientInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const header = ctx.switchToHttp().getRequest<WithHeaders>().headers?.[HEADER];
    return new Observable((subscriber) =>
      withUploadClient(header, () => next.handle().subscribe(subscriber)),
    );
  }
}
