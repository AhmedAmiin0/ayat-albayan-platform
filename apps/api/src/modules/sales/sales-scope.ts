import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { waHttpError } from '../whatsapp/template.mapper';
import { SalesQueries } from './sales.queries';

/** What a signed-in salesperson may see in the inbox: their leads' chats and the families those leads became. */
export interface SalesScope {
  salesId: string;
  phones: ReadonlySet<string>;
  studentIds: ReadonlySet<string>;
}

/** 403 not_your_thread for any phone outside the salesperson's scope (rule 9, server-side). */
export function assertSalesPhone(scope: SalesScope, phone: string): void {
  if (!scope.phones.has(phone)) throw waHttpError('not_your_thread', 403);
}

/** Resolves a salesperson's scope once per request; null for everyone else. */
@Injectable()
export class SalesScopes {
  constructor(private readonly queries: SalesQueries) {}

  async of(user: AuthUser): Promise<SalesScope | null> {
    if (user.role !== 'sales') return null;
    const own = await this.queries.ownership(user.id);
    return { salesId: user.id, phones: new Set(own.phones), studentIds: new Set(own.studentIds) };
  }
}
