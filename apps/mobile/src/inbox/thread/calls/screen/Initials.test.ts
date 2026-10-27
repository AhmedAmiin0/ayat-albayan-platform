import { ltr } from '@/core/ui/primitives/Ltr';
import { initialOf } from './Initials';

describe('initialOf: the first letter of the name, never a mark or a digit', () => {
  it('an Arabic name gives its first letter', () => {
    expect(initialOf('أحمد علي')).toBe('أ');
  });

  it('an English name gives its first letter', () => {
    expect(initialOf('  Huda Salem')).toBe('H');
  });

  it('a bare number (isolated left to right) has no letter: «?»', () => {
    expect(initialOf(ltr('+966 50 000 0001'))).toBe('?');
  });

  it('a blank name gives «?»', () => {
    expect(initialOf('   ')).toBe('?');
  });
});
