import { callsRoutes } from '@ab/shared';
import { pathKey } from '../../../core/keys';
import type { CallsKeys } from './calls-api.types';

const all = pathKey(callsRoutes.list.path);

export const callsKeys: CallsKeys = {
  all,
  config: pathKey(callsRoutes.config.path),
  active: pathKey(callsRoutes.active.path),
  list: (phone) => [...all, 'list', phone ?? 'all'],
  permission: (phone) => [...all, 'permission', phone],
};
