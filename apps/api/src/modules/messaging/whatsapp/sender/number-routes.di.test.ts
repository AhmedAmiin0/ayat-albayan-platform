import { describe, expect, it } from 'vitest';
import { CodeSend } from '@/modules/messaging/whatsapp/direct/code-send';
import { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { MessageSender } from './message.sender';

// docs/32 s2 (D1: constructors take 4): the optional NumberRoutes moves from a property into the
// constructor, still optional (absent = module mode sends nothing).
describe.each([
  ['MessageSender', MessageSender],
  ['CodeSend', CodeSend],
])('%s DI', (_name, target) => {
  it('takes NumberRoutes as an optional 4th constructor dependency, not as a property', () => {
    const types = Reflect.getMetadata('design:paramtypes', target) as unknown[];
    expect(types).toHaveLength(4);
    expect(types[3]).toBe(NumberRoutes);
    expect(Reflect.getMetadata('optional:paramtypes', target)).toEqual([3]);
    expect(Reflect.getMetadata('self:properties_metadata', target)).toBeUndefined();
  });
});
