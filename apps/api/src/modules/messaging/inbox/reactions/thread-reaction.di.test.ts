import { describe, expect, it } from 'vitest';
import { Outbox } from '@/modules/messaging/inbox/send/outbox';
import { MessageViews } from '@/modules/messaging/whatsapp';
import { ThreadReactionService } from './thread-reaction.service';

// docs/32 s2 (D1: constructors take 4): MessageViews moves from a property into the constructor.
describe('ThreadReactionService DI', () => {
  it('takes MessageViews as its 4th constructor dependency, not as a property', () => {
    const types = Reflect.getMetadata('design:paramtypes', ThreadReactionService) as unknown[];
    expect(types).toHaveLength(4);
    expect(types[2]).toBe(Outbox);
    expect(types[3]).toBe(MessageViews);
    expect(Reflect.getMetadata('self:properties_metadata', ThreadReactionService)).toBeUndefined();
  });
});
