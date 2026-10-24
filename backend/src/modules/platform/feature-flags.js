/**
 * platform/feature-flags.js
 * Feature flags — v1: all flags are off.
 * Extension point: v2+ reads from config/env to enable released-but-switchable features.
 *
 * Rule: do not leave dead or half-built code behind flags.
 * Only guard features that are fully released but need a toggle.
 *
 * @param {string} flag - feature flag name
 * @returns {boolean}
 */
export function featureEnabled(_flag) {
  return false;
}
