import {
  portalActionResultSchema,
  portalSlotsSchema,
  type PortalActionResult,
  type PortalCancel,
  type PortalRequest,
  type PortalSlots,
} from '@ab/shared';
import type { ApiClient } from '../../../core/http/index.js';
import { pathKey } from '../../../core/keys/index.js';
import type { PortalRead } from '../portal-api.js';

// Shared by family app and web portal; answers are parsed (rule 12), then PORTAL_KEY refreshes.

export interface FamilyLessonInput {
  studentId: string;
  lessonId: string;
}

export interface FamilySlotsInput extends FamilyLessonInput {
  from: string;
  to: string;
}

export interface PortalLessonSends {
  confirm: (input: FamilyLessonInput) => Promise<PortalActionResult>;
  cancel: (input: FamilyLessonInput & PortalCancel) => Promise<PortalActionResult>;
  request: (input: FamilyLessonInput & PortalRequest) => Promise<PortalActionResult>;
  withdraw: (input: FamilyLessonInput) => Promise<PortalActionResult>;
}

const enc = encodeURIComponent;
const lessonPath = (i: FamilyLessonInput) =>
  `/portal/students/${enc(i.studentId)}/lessons/${enc(i.lessonId)}`;

export function portalLessonSends(client: ApiClient): PortalLessonSends {
  const post = (i: FamilyLessonInput, verb: string, body?: object): Promise<PortalActionResult> =>
    client
      .apiSend('POST', `${lessonPath(i)}/${verb}`, body)
      .then((r: unknown) => portalActionResultSchema.parse(r));
  return {
    confirm: (i) => post(i, 'confirm'),
    cancel: ({ reason, ...i }) => post(i, 'cancel', reason ? { reason } : {}),
    request: ({ startsAt, note, ...i }) => post(i, 'request', { startsAt, ...(note ? { note } : {}) }),
    withdraw: (i) => post(i, 'withdraw'),
  };
}

/** GET …/slots for one week: the free starts, on the student's clock (`tz`). */
export function portalSlotsQuery(client: ApiClient) {
  return (input: FamilySlotsInput): PortalRead<PortalSlots> => {
    const query = new URLSearchParams({ from: input.from, to: input.to }).toString();
    const path = `${lessonPath(input)}/slots`;
    return {
      queryKey: [...pathKey(path), input.from],
      queryFn: async () => portalSlotsSchema.parse(await client.apiFetch(`${path}?${query}`)),
      refetchOnWindowFocus: true,
    };
  };
}
