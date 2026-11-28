import type { portalRoutes as routes } from '@ab/shared';
import type { RouteInputOf } from '@/common/http/route';

export type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;
