import {DEFAULT_FLAGS,enabled} from './feature-policy.mjs';
export const FEATURE_STATES=Object.freeze(['OFF','TEST','LIMITED','ON']);
export const FEATURE_DEFAULTS=DEFAULT_FLAGS;
export function featureState(key){return Object.hasOwn(DEFAULT_FLAGS,key)?DEFAULT_FLAGS[key]:'OFF'}
export function isFeatureEnabled(key){return enabled(DEFAULT_FLAGS,key)}
