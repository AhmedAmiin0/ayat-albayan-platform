import { portalRoutes, type PortalFileUrl, type PortalRoomLink } from '@ab/shared';
import type { RoomJoinResult } from '@ab/schedule';
import { callWith, type ApiClient } from '../../core/http';

// The family portal's writes: the guest admission to our classroom (inside the window only), the
// signed /join link that opens it in the phone's browser (no second sign-in), and a signed link
// to a sent report's PDF (5 minutes) or a visible recording (an hour).

export interface PortalJoinInput {
  studentId: string;
  lessonId: string;
}

export type PortalFileKind = 'reports' | 'recordings';

export interface PortalFileInput {
  studentId: string;
  kind: PortalFileKind;
  id: string;
}

export interface PortalSends {
  join: (input: PortalJoinInput) => Promise<RoomJoinResult>;
  /** The lesson's room in the system browser: a signed /join URL, valid until the room closes. */
  roomLink: (input: PortalJoinInput) => Promise<PortalRoomLink>;
  fileUrl: (input: PortalFileInput) => Promise<PortalFileUrl>;
}

export function portalSends(client: ApiClient): PortalSends {
  const call = callWith(client);
  const fileUrls: Record<PortalFileKind, (i: PortalFileInput) => Promise<PortalFileUrl>> = {
    reports: (i) =>
      call({ route: portalRoutes.reportUrl, params: { id: i.studentId, reportId: i.id } }),
    recordings: (i) =>
      call({ route: portalRoutes.recordingUrl, params: { id: i.studentId, recordingId: i.id } }),
  };
  return {
    join: ({ studentId, lessonId }) =>
      call({ route: portalRoutes.join, params: { id: studentId, lessonId } }),
    roomLink: ({ studentId, lessonId }) =>
      call({ route: portalRoutes.roomLink, params: { id: studentId, lessonId } }),
    fileUrl: (input) => fileUrls[input.kind](input),
  };
}
