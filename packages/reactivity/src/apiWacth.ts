import { isArray, isFunction, isMap, isObject, isPlainObject, isSet, NOOP } from '@vue/shared';
import { isRef } from './ref';
import { isReactive } from './reactive';
import { ReactiveEffect } from './effect';


export function watch(source, cb, options?) {
  return doWatch(source, cb, options);
}

export function watchEffect(source, options?) {
  return doWatch(source, null, options);
}


function doWatch(source, cb, { deep = false, immediate = false } = {}) {
  // for deep: true：全部遍历
  // for deep: false：仅遍历根级别属性
  const reactiveGetter = source => deep === true
    ? source
    : traverse(source, deep === false ? 1 : undefined);

  // 生成一个可以给ReactiveEffect使用的getter，getter执行时，getter内的响应式数据会收集当前的reactiveEffect
  let getter: () => any;
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isFunction((source))) {
    getter = source;
  } else if (isArray(source)) {
    getter = () => {
      return source.map(s => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return reactiveGetter(s);
        } else if (isFunction(s)) {
          return s();
        }
      });
    };
  } else {
    getter = NOOP;
  }


  if (cb && deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  let oldValue;

  // 【闭包】保存上一次的清理函数，在下一次执行watch回调函数时执行上一次的清理逻辑
  let clean;
  const onCleanup = fn => {
    clean = () => {
      fn();
      clean = undefined;
    };
  };

  // scheduler
  const job = () => {
    if (cb) {
      const newValue = effect.run();

      if (clean) {
        clean(); // 执行回调前，先执行上一次的清理操作进行清理
      }

      cb(newValue, oldValue, onCleanup);

      oldValue = newValue;
    } else {
      effect.run(); // watchEffect没有cb回调函数，数据变化后直接run
    }
  };

  /*
    该effect执行run的时候，会调用getter方法
    getter内使用到的响应式属性/ref会收集该effect
    当这些属性/ref变化的时候会触发scheduler重新执行
  */
  const effect = new ReactiveEffect(getter, job);

  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect.run();
    }
  } else {
    effect.run();
  }

  const unwatch = () => {
    effect.stop();
  };

  return unwatch; // 返回取消监控方法
}

/**
 * 遍历属性值
 * 只有响应式的对象才可编译
 * @param value 要遍历的响应式对象
 * @param depth 非deep:true时为1，仅遍历根节点
 * @param seen 已经处理过的对象的集合
 */
function traverse(value, depth = Infinity, seen?: Set<unknown>) {
  if (!isObject(value) || depth <= 0) {
    return value;
  }

  seen = seen || new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  depth--;

  if (isRef(value)) {
    traverse(value.value, depth, seen);
  } else if (isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      traverse(value[index], depth, seen);
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach(v => {
      traverse(v, depth, seen);
    });
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen);
    }
  }

  return value;
}
