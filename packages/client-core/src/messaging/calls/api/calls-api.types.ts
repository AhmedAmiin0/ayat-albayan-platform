import type {
  ActiveCallView,
  CallConfigView,
  CallListQueryInput,
  CallPermissionView,
  CallView,
  MessageView,
  StartCallInput,
} from '@ab/shared';
import type { ApiClient } from '../../../core/http';

/** What an app injects: its API client and how it makes an idempotency id. */
export interface CallsApiDeps {
  client: ApiClient;
  requestId: () => string;
}

export interface CallSends {
  startCall: (body: StartCallInput) => Promise<ActiveCallView>;
  acceptCall: (id: string, sdp: string) => Promise<ActiveCallView>;
  rejectCall: (id: string) => Promise<ActiveCallView>;
  endCall: (id: string) => Promise<ActiveCallView>;
  /** The ask goes out as a template message; that message is the answer. */
  requestCallPermission: (phone: string) => Promise<MessageView>;
}

export interface CallReads {
  config: () => Promise<CallConfigView>;
  active: () => Promise<ActiveCallView[]>;
  list: (query: CallListQueryInput) => Promise<CallView[]>;
  permission: (phone: string) => Promise<CallPermissionView>;
}

/** One poll of /calls/active and when it STARTED: a slow poll begun before a call existed
 * must not read as «ended». */
export interface ActivePoll {
  startedAt: number;
  rows: ActiveCallView[];
}

export interface CallsKeys {
  /** Every calls read sits under it; the realtime nudge invalidates it. */
  all: string[];
  config: string[];
  active: string[];
  /** One chat's calls by its number, or the whole log under 'all'. */
  list: (phone: string | null) => string[];
  permission: (phone: string) => string[];
}

export interface ActiveCallsInput {
  enabled: boolean;
  live: boolean;
  /** Mobile: false while the app is in the background; default true. */
  polling?: boolean;
}

export interface CallListInput {
  enabled: boolean;
  phone: string | null;
}

interface CallsQuery<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  retry: false;
}

interface PolledQuery<T> extends CallsQuery<T> {
  enabled: boolean;
  refetchInterval: number | false;
}

interface StaleQuery<T> extends CallsQuery<T> {
  staleTime: number;
}

export interface CallQueries {
  callConfigQuery: StaleQuery<CallConfigView>;
  activeCallsQuery: (input: ActiveCallsInput) => PolledQuery<ActivePoll>;
  callListQuery: (input: CallListInput) => PolledQuery<CallView[]>;
  callPermissionQuery: (phone: string) => StaleQuery<CallPermissionView>;
}
