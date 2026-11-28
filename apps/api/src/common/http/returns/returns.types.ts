/** A method decorator whose handler must return (a promise of) `T`, checked at compile time. */
export type ReturnsDecorator<T> = <F extends (...a: never[]) => T | Promise<T>>(
  target: object,
  key: string | symbol,
  d: TypedPropertyDescriptor<F>,
) => void;
