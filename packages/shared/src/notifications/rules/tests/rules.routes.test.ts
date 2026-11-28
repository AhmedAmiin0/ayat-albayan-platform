import { describe, expect, it } from 'vitest';
import { rulePatchSchema } from '../../rules.types';
import {
  notificationEntryViewSchema,
  notificationsOverviewSchema,
} from '../rules-overview.schemas';
import { notificationRuleRoutes as routes } from '../rules.routes';

describe('notificationRuleRoutes', () => {
  it('reads the catalogue for settings readers, tagged notifications', () => {
    expect(routes.overview).toMatchObject({
      method: 'GET',
      path: '/admin/notifications',
      response: notificationsOverviewSchema,
      permissions: ['settings.read'],
      tags: ['notifications'],
    });
  });

  it('writes one row under its two paths for notification managers', () => {
    const write = {
      method: 'PATCH',
      body: rulePatchSchema,
      response: notificationEntryViewSchema,
      permissions: ['notifications.manage'],
      tags: ['notifications'],
    };
    expect(routes.update).toMatchObject({ ...write, path: '/admin/notifications/:key' });
    expect(routes.updateAlias).toMatchObject({
      ...write,
      path: '/admin/communications/notifications/:key',
    });
  });

  it('takes any key as text, so the handler answers an unknown one', () => {
    expect(routes.update.params.parse({ key: 'nope' })).toEqual({ key: 'nope' });
  });
});
