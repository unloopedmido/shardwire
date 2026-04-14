/**
 * Reference URL routing for generated docs. MUST stay aligned with
 * `packages/shardwire/src/utils/reference-doc-url.ts` (used in the package and tests).
 */

export function slugify(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * @param {string} name Public export symbol name (same rules as `getCategoryId` in the former inline generator).
 * @returns {string} Reference section id (folder under `/docs/reference/`).
 */
export function getReferenceCategoryId(name) {
  if (name.startsWith('createThreadThen') || name.startsWith('defer')) {
    return 'workflows';
  }

  if (
    name === 'defineShardwireApp' ||
    name === 'generateSecretScope' ||
    name === 'diagnoseShardwireApp' ||
    name === 'getShardwireCatalog' ||
    name.startsWith('ShardwireApp') ||
    name.startsWith('DiagnoseShardwire') ||
    name.startsWith('CapabilityExplanation') ||
    name.startsWith('Preflight') ||
    name === 'ShardwireCatalog'
  ) {
    return 'contracts-and-diagnostics';
  }

  if (
    name.includes('Error') ||
    name.includes('Failure') ||
    name === 'ActionResult' ||
    name === 'ActionSuccess' ||
    name === 'ActionFailure'
  ) {
    return 'errors-and-failures';
  }

  if (
    name.includes('Action') ||
    name === 'BotActionName' ||
    name === 'BotActionPayloadMap' ||
    name === 'BotActionResultDataMap'
  ) {
    return 'action-models';
  }

  if (
    name.includes('Event') ||
    name.startsWith('Bridge') ||
    name === 'BotIntentName' ||
    name === 'BotEventName' ||
    name === 'ShardwireSubscriptionFilterKey'
  ) {
    return 'event-and-data-models';
  }

  return 'bridge-apis';
}
