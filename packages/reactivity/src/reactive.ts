import { isObject } from '@vue/shared';
import { ReactiveFlags } from './constants';
import { mutableHandlers } from './baseHandler';

/**
 * 用于记录原始对象和响应式对象
 */
const reactiveMap = new WeakMap();

/**
 * 创建响应式对象
 * @param target 目标对象
 */
function createReactiveObject(target) {
  // 响应式数据必须是对象
  if (!isObject(target)) {
    return target;
  }

  // 被代理过的proxy对象会有get和set方法，target如果已经被代理过了，会执行get返回true
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }

  // 已经代理过的对象不再重新代理
  const existProxy = reactiveMap.get(target);
  if (existProxy) {
    return existProxy;
  }

  const proxy = new Proxy(target, mutableHandlers);

  // 缓存代理后的结果
  reactiveMap.set(target, proxy);

  return proxy;
}

/**
 * 创建响应式对象
 * @param target 目标对象
 */
export function reactive(target) {
  return createReactiveObject(target);
}

/**
 * 将对象转换为响应式对象，简单类型不做处理
 * @param value
 */
export function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}

/**
 * 判断是否为响应式对象
 * @param value
 */
export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}