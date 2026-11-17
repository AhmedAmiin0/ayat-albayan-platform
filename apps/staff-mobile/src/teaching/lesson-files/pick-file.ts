import type { PickedFile } from '@ab/client-core';

// The phone's file pickers (owner 2026-11-17: «المعرض» · «الكاميرا» · «مستند»). expo-image-picker
// and expo-document-picker are not in this build yet: this is the one slot to fill.

export const PICK_SOURCES = ['gallery', 'camera', 'document'] as const;
export type PickSource = (typeof PICK_SOURCES)[number];

/** A picked file (its bytes, name, type and size), or null when the user backed out. */
export type PickFile = (source: PickSource) => Promise<PickedFile | null>;

/** False until the native pickers ship: the screen says so instead of offering dead buttons. */
export const pickersReady = (): boolean => false;

/**
 * TODO(lead, native PR): the pickers. gallery/camera → expo-image-picker
 * (launchImageLibraryAsync / launchCameraAsync, mediaTypes images, quality 0.8); document →
 * expo-document-picker getDocumentAsync({ type: ['application/pdf', 'audio/*', 'image/*'] }).
 * Read the asset's bytes (fetch(uri).arrayBuffer()), map { name, mimeType, size } to PickedFile,
 * null on canceled; then make pickersReady() answer true.
 */
export const pickFile: PickFile = () => Promise.resolve(null);
