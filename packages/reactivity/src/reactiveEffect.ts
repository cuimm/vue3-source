import { activeEffect, trackEffect, triggerEffects } from './effect';

/**
 * 依赖收集Mapping
 */
const targetMap = new WeakMap();

/**
 * 创建一个dep，并且在该dep上增加指定属性
 * @param clearup dep清理逻辑
 * @param key 此参数仅作调试
 */
function createDep(clearup, key) {
  const dep = new Map() as any;
  dep.clearup = clearup;
  dep.key = key;
  return dep;
}

/**
 * 依赖收集
 * @param target 目标对象
 * @param key 属性key
 */
export function track(target, key) {
  if (activeEffect) {
    /**
     * 构建依赖映射表
     */
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(
        key,
        (dep = createDep(() => depsMap.delete(key), key)) // 用于清理target上不需要的属性
      );
    }

    /*
    * 依赖收集
    * 将当前的effect加入到dep中
    */
    trackEffect(activeEffect, dep);

    console.log(targetMap);
  }
}

/**
 * 触发依赖更新
 * @param target 目标对象
 * @param key 属性key
 * @param newValue 新值
 * @param oldValue 老值
 */
export function trigger(target, key, newValue, oldValue) {
  const depMap = targetMap.get(target);
  if (!depMap) {
    return;
  }
  const dep = depMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}

/**
 targetMap[WeakMap]: { targetObj: { 属性prop: { effect, effect, ... } } }

 {
    { name: 'cuimm', age: 18}: { -- depsMap
      cuimm: {
        effect1,
        effect2,
        ...
      },
      age: {
        effect1,
        effect3,
        ...
      }
    },
    { name: 'cui' }: {
      'cui': { ... }
    }
}
 */