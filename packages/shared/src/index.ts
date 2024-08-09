export * from './shapeFlags';
export * from './patchFlags';

const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (value, key) => hasOwnProperty.call(value, key);

export const warn = console.warn;

export const NOOP = () => {
};

export function isUndefined(value) {
  return value === undefined;
}

export function isNull(value) {
  return value === null;
}

export function isString(value) {
  return typeof value === 'string';
}

export function isNumber(value) {
  return typeof value === 'number';
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

export const toDisplayString = value => {
  return isString(value)
    ? value
    : isNull(value)
      ? ''
      : isObject(value)
        ? JSON.stringify(value)
        : String(value);
};
