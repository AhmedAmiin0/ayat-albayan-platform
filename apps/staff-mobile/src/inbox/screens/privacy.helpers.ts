import { screen } from '@testing-library/react-native';

/** The number in every way it is written: grouped, bare, and its last four digits. */
export const SHOWN = ['+966 55 214 7730', '966552147730', '7730'];

/** Only the plain data of a prop (strings, arrays, objects of them); functions and contexts drop. */
const TEST_NODE = Symbol.for('react.test.json');
const plain = (key: string, v: unknown): unknown => {
  if (key === 'data') return undefined; // a list's raw rows are data, not what is shown
  if (typeof v === 'function') return undefined;
  const tag = v && typeof v === 'object' ? (v as { $$typeof?: symbol }).$$typeof : undefined;
  return tag && tag !== TEST_NODE ? undefined : v;
};

/** Everything rendered: text and every prop (accessibility labels, hints, titles). */
export const readable = (): string => {
  try {
    return JSON.stringify(screen.toJSON(), plain);
  } catch {
    return '';
  }
};
