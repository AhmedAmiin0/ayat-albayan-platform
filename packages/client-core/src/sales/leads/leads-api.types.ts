import type { RouteResult } from '@ab/core';
import type {
  LeadFollowUp,
  LeadListQueryInput,
  LeadQualificationPatch,
  leadReadRoutes,
  LeadStatusBody,
  leadWriteRoutes,
} from '@ab/shared';

type Answer<K extends keyof typeof leadWriteRoutes> = Promise<
  RouteResult<(typeof leadWriteRoutes)[K]>
>;

export interface LeadStatusMove extends LeadStatusBody {
  id: string;
}

export interface LeadQualificationEdit {
  id: string;
  patch: LeadQualificationPatch;
}

export interface LeadPause extends LeadFollowUp {
  id: string;
}

export interface LeadWriteCalls {
  changeStatus: (input: LeadStatusMove) => Answer<'changeStatus'>;
  reclassify: (id: string) => Answer<'reclassify'>;
  qualification: (input: LeadQualificationEdit) => Answer<'qualification'>;
  followUp: (input: LeadPause) => Answer<'followUp'>;
}

export interface LeadReadCalls {
  list: (query: LeadListQueryInput) => Promise<RouteResult<typeof leadReadRoutes.list>>;
}
