/**
 * audit_log.entity_id of an entity that has no row id of its own: the academy-wide settings
 * (entity 'settings') and the custom entries (entity 'custom_config', whose key is not a uuid and
 * goes in the action instead: 'update:promo'). The nil UUID.
 */
export const SINGLETON_ENTITY_ID = '00000000-0000-0000-0000-000000000000';
