import { ParseUUIDPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { invalidUuid } from '@/modules/messaging/inbox/threads/phone-param';

describe('invalidUuid (a bad id param)', () => {
  it('answers exactly what ParseUUIDPipe answered', async () => {
    const pipe = new ParseUUIDPipe();
    const old = await pipe.transform('x', { type: 'param' }).catch((e: unknown) => e);
    const now = invalidUuid();
    expect(now.getStatus()).toBe(400);
    expect(old).toMatchObject({ response: now.getResponse() });
  });
});
