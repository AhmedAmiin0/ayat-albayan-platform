import { describe, expect, it } from 'vitest';
import { livekitWebhookRoutes as routes } from '@/modules/teaching/classroom/livekit';

describe('livekitWebhookRoutes', () => {
  it('keeps the path of today under the classroom tag', () => {
    const { receive } = routes;
    expect([receive.method, receive.path, receive.tags]).toEqual([
      'POST',
      '/livekit/webhook',
      ['classroom'],
    ]);
  });

  it('answers with no body and leaves the payload to the signature check', () => {
    expect(routes.receive.response).toBe('empty');
    expect(routes.receive).not.toHaveProperty('body');
    expect(routes.receive).not.toHaveProperty('permissions');
  });
});
