import {isObject} from '@vue/shared';

/**
 * 用于记录原始对象和响应式对象
 */
const reactiveMap = new WeakMap();

enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive'
}

/**
 * ProxyHandler
 */
const mutableHandlers: ProxyHandler<any> = {
    get(target, key, recevier) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return true;
        }
    },
    set(target, key, value, recevier) {
        return true;
    }
};

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

    return  proxy;
}

export function reactive(target) {
    return createReactiveObject(target);
}