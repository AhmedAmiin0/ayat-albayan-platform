import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';
import {
  familyOfPhoneRow,
  phoneSources,
  profileOfPhone,
  teacherProfileOfPhone,
  type PhoneRow,
} from './phone-sources.repo';

export interface PersonRow {
  id: string;
  full_name: string;
  role: string;
  phone_e164: string | null;
}

/** Who a verified phone belongs to, when known (a login, a family). */
export interface PhoneOwner {
  profileId: string | null;
  guardianId: string | null;
}

const PERSON = 'id, full_name, role, phone_e164';
/** LIKE pattern: `%`, `_` and `\` escaped. */
const like = (s: string): string => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * The people a managed link names (docs/19): profiles, the phone ON FILE of a listed profile (its
 * own, else its teacher / family / student's family row) and the owner of a verified phone.
 */
@Injectable()
export class LinkPeopleRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async byIds(ids: string[]): Promise<PersonRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('profiles').select(PERSON).in('id', ids);
    if (error) throw pgError(error);
    return data;
  }

  /** The picker: enabled profiles whose name or phone matches, 20 at most. */
  async search(text: string): Promise<PersonRow[]> {
    const pattern = like(text);
    const { data, error } = await this.db
      .from('profiles')
      .select(PERSON)
      .is('disabled_at', null)
      .or(`full_name.ilike.${JSON.stringify(pattern)},phone_e164.ilike.${JSON.stringify(pattern)}`)
      .order('full_name')
      .limit(20);
    if (error) throw pgError(error);
    return data;
  }

  /** Each profile's phone on file (the first source that has one), for the WhatsApp send. */
  async phonesOf(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await Promise.all(phoneSources(this.db).map((read) => read(ids)));
    const found = new Map<string, string>();
    for (const row of rows.flat()) firstWins(found, row);
    return found;
  }

  /** A login first (its own phone, its family's, its teacher record's), and the family if any. */
  async ownerOfPhone(phone: string): Promise<PhoneOwner> {
    const [own, family, teacher] = await Promise.all([
      profileOfPhone(this.db, phone),
      familyOfPhoneRow(this.db, phone),
      teacherProfileOfPhone(this.db, phone),
    ]);
    const profileId = [own, family?.profile_id ?? null, teacher].find((id) => id !== null);
    return { profileId: profileId ?? null, guardianId: family?.id ?? null };
  }

  async familyNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.db.from('guardians').select('id, name').in('id', ids);
    if (error) throw pgError(error);
    return new Map(data.map((g) => [g.id, g.name]));
  }
}

/** Sources are read in order: a profile keeps the phone of the first source that had one. */
function firstWins(found: Map<string, string>, row: PhoneRow): void {
  if (!found.has(row.profileId)) found.set(row.profileId, row.phone);
}
