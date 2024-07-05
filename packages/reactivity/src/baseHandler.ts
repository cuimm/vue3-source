import { ReactiveFlags } from './constants';
import { track, trigger } from './reactiveEffect';
/**
 * ProxyHandler
 */
export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }

    // 依赖收集
    track(target, key);

    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {

    const oldValue = target[key];

    const result = Reflect.set(target, key, value, receiver);

    if (oldValue !== value) {
      // 新值和老值不一样时，触发依赖更新
      trigger(target, key, value, oldValue);
    }

    return result;
  }
};