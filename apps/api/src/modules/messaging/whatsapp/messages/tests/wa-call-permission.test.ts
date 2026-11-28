import { describe, expect, it } from 'vitest';
import {
  CALL_PERMISSION_PAYLOAD,
  isCallPermissionRequest,
} from '@/modules/messaging/whatsapp/messages/wa-call-permission';

describe('isCallPermissionRequest', () => {
  it('true for the marker, extra keys included', () => {
    expect(isCallPermissionRequest(CALL_PERMISSION_PAYLOAD)).toBe(true);
    expect(isCallPermissionRequest({ ...CALL_PERMISSION_PAYLOAD, at: 'x' })).toBe(true);
  });

  it('false for another type, a non-object or nothing', () => {
    for (const payload of [{ type: 'reaction' }, {}, [], 'call_permission_request', null, undefined]) {
      expect(isCallPermissionRequest(payload)).toBe(false);
    }
  });
});
