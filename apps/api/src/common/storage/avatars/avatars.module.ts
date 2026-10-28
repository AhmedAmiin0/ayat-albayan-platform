import { Global, Module } from '@nestjs/common';
import { AVATAR_FILES, StorageAvatarFiles } from './avatar-files';
import { AvatarWriter } from './avatar-writer';
import { StaffPhotoAdmin } from './staff-photo-admin';
import { StaffPhotos } from './staff-photos';

/** Global: the account page, the admin's teacher / user photo and every list that shows a staff member. */
@Global()
@Module({
  providers: [{ provide: AVATAR_FILES, useClass: StorageAvatarFiles }, AvatarWriter, StaffPhotos, StaffPhotoAdmin],
  exports: [AVATAR_FILES, AvatarWriter, StaffPhotos, StaffPhotoAdmin],
})
export class AvatarsModule {}
