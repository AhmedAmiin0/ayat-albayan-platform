import { describe, expect, it } from 'vitest';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { GoogleCallbackController } from '@/modules/platform/google-sync/oauth/google-callback.controller';

describe('google callback access', () => {
  it('lets Google send the browser back through the public route object alone', () => {
    const callback: object = Object(Reflect.get(GoogleCallbackController.prototype, 'callback'));
    expect(Reflect.getOwnMetadata(IS_PUBLIC, callback)).toBe(true);
    expect(Reflect.getOwnMetadata(OWN_PUBLIC, callback)).toBeUndefined();
  });
});
