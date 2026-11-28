import type { ReactNode } from 'react';
import type { RoomContext } from '@ab/web-kit/classroom/flow/room-kit';

export interface ContextHeaderProps {
  context: RoomContext | null;
  children?: ReactNode;
}
