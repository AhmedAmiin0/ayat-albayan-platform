// Online now and last seen on the phone (docs/33): the watch and the text inputs live in the shared
// kit (the family chat shows them too); the self track stays here, mounted by the staff root.
export {
  byLastSeen,
  peerOnline,
  type PresenceClock,
  usePresenceClock,
  usePresenceWatch,
} from '@ab/mobile-kit';
export { usePresenceSelf } from './use-presence-self';
