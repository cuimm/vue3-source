export const NOOP = () => {}

export function isObject(value) {
    return value !== null && typeof value === 'object';
}

export function isFunction(value) {
  return typeof value === 'function';
}

export function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}