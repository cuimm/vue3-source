import { activeEffect } from './effect';

/**
 * 依赖收集
 * @param target 目标对象
 * @param key 属性key
 */
export function track(target, key) {
  if (activeEffect) {
    console.log(target, key);
  }
}