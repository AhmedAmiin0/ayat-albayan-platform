import {
  maySeePresence,
  type ChannelPresence,
  type PresencePeer,
  type PresenceSelf,
  type StaffPresence,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { PresenceRepo } from './presence.repo';
import { PresenceSettings } from './presence.settings';

/** A channel the caller already passed the channel's own access check for (ChannelAccess). */
interface ChannelSeat {
  viewer: AuthUser;
  studentId: string;
  /** A participant (teacher, family) rather than a monitor (admin, owning assistant). */
  participant: boolean;
  /** channel_is_open: a participant of a closed channel sees nobody. */
  open: boolean;
}

const OFF = { enabled: false } as const;

/** The presence answers (docs/33 §2): only people the caller may already open a chat with. */
@Injectable()
export class PresenceService {
  constructor(
    private readonly repo: PresenceRepo,
    private readonly settings: PresenceSettings,
  ) {}

  async self(): Promise<PresenceSelf> {
    return { enabled: await this.settings.enabled() };
  }

  async channel(seat: ChannelSeat): Promise<ChannelPresence> {
    if (!(await this.settings.enabled())) return { ...OFF, peers: [] };
    if (seat.participant && !seat.open) return { enabled: true, peers: [] };
    const people = (await this.repo.channelPeople(seat.studentId)).filter(
      (p) =>
        p.profile_id !== seat.viewer.id &&
        maySeePresence({ viewer: seat.viewer.role, target: p.role, linked: true }),
    );
    const seen = await this.repo.lastSeen(people.map((p) => p.profile_id));
    const peers: PresencePeer[] = people.map((p) => ({
      ...p,
      last_seen_at: seen.get(p.profile_id) ?? null,
    }));
    return { enabled: true, peers };
  }

  /** The admin's staff list (base role admin only, whatever the permission set). */
  async staff(viewer: AuthUser): Promise<StaffPresence> {
    if (viewer.role !== 'admin') throw forbidden('presence_admin_only');
    if (!(await this.settings.enabled())) return { ...OFF, staff: [] };
    const rows = await this.repo.staff();
    const seen = await this.repo.lastSeen(rows.map((r) => r.id));
    const staff = rows.map((r) => ({
      profile_id: r.id,
      name: r.full_name,
      role: r.role,
      last_seen_at: seen.get(r.id) ?? null,
    }));
    return { enabled: true, staff };
  }
}
