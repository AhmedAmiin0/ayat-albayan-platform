import { Pill } from '@ab/web-kit';

/** A pill while any lesson waits for the guardian, else a plain 0. */
export const Awaiting = ({ n }: { n: number }) => (n > 0 ? <Pill tone="act">{n}</Pill> : <>{n}</>);
