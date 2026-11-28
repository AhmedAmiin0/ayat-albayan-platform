import { defineRoute } from '@ab/core';
import { activityListQuery } from '../../schemas';
import { activityPageSchema } from './activity.schemas';

/** The admin activity log (R-NFR-08). */
export const activityRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/activity',
    query: activityListQuery,
    response: activityPageSchema,
    permissions: ['activity.read'],
    tags: ['activity'],
  }),
};

const sessionReport = (path: string) =>
  defineRoute({
    method: 'POST',
    path,
    response: 'empty',
    tags: ['activity'],
  });

/** Sign-in happens against the auth provider in the browser, which reports it here (no body). */
export const activitySessionRoutes = {
  login: sessionReport('/activity/session/login'),
  logout: sessionReport('/activity/session/logout'),
  loginFailed: sessionReport('/activity/session/login-failed'),
};
