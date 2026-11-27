import { Pill } from '@ab/web-kit';
import type { AwaitingProps } from './Awaiting.types';

/** A pill while any lesson waits for the guardian, else a plain 0. */
export const Awaiting = ({ n }: AwaitingProps) => (n > 0 ? <Pill tone="act">{n}</Pill> : <>{n}</>);
