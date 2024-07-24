export * from './shapeFlags';

export const NOOP = () => {
};

export function isString(value) {
  return typeof value === 'string';
}

export function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function isFunction(value) {
  return typeof value === 'function';
}

export const isArray = Array.isArray;

export function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}

export const objectToString = Object.prototype.toString;

export const toTypeString = value => objectToString.call(value);

export const isPlainObject = value => toTypeString(value) === '[object Object]';

export const isMap = value => toTypeString(value) === '[object Map]';

export const isSet = value => toTypeString(value) === '[object Set]';

export const isOn = key => {
  return key.charCodeAt(0) === 111 /* o */
  && key.charCodeAt(1) === 110 /* n */
  && (key.charCodeAt(2) > 122 || key.charCodeAt(2) < 97); // uppercase letter
};

