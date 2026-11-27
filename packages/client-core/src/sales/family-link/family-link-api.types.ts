import type { RouteResult } from '@ab/core';
import type { leadFamilyRoutes } from '@ab/shared';

export interface LeadFamilyLinkRequest {
  leadId: string;
  code: string;
}

export interface LeadFamilyCalls {
  link: (input: LeadFamilyLinkRequest) => Promise<RouteResult<(typeof leadFamilyRoutes)['link']>>;
}
