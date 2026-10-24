import type { ConfigEntryError, SettingOwner } from '@ab/shared';
import { ConflictException, ForbiddenException, HttpException, HttpStatus, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

// The /config/entries error bodies (docs/26 §2f): `code` is the contract (CONFIG_ENTRY_ERRORS);
// `message` repeats it, as every other route's error body carries one.

const body = (code: ConfigEntryError, extra: object = {}) => ({ code, message: code, ...extra });

/** 404 `unknown_key`: the code does not know this key. */
export const unknownKey = (): HttpException => new NotFoundException(body('unknown_key'));

/** 409 `owned_by_module`: a module page edits this value. */
export const ownedByModule = (ownedBy: SettingOwner | null): HttpException =>
  new ConflictException(body('owned_by_module', { ownedBy }));

/** 422 `invalid`: the value fails the entry's schema. */
export const invalidValue = (issues: { path: string; message: string }[]): HttpException =>
  new UnprocessableEntityException(body('invalid', { issues }));

/** 428 `confirmation_required`: the typed text (the number of days) is missing or wrong. */
export const confirmationRequired = (): HttpException =>
  new HttpException(body('confirmation_required'), HttpStatus.PRECONDITION_REQUIRED);

/** 403 `owner_permission`: an owned key's description needs the owning module's permission. */
export const ownerPermission = (ownedBy: SettingOwner | null): HttpException =>
  new ForbiddenException({ code: 'owner_permission', message: 'owner_permission', ownedBy });
