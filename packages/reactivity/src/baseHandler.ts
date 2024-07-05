import { ReactiveFlags } from './constants';

/**
 * ProxyHandler
 */
export const mutableHandlers: ProxyHandler<any> = {
    get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return true;
        }

        // 依赖收集 todo...

        return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {

        // 触发更新 todo...

        return Reflect.set(target, key, value, receiver);
    }
};