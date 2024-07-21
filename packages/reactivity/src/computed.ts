/*
  * 计算属性实现原理：
  * 1. 计算属性维护了一个dirty属性，默认为true，也就是脏的。
  * 计算属性运行过一次之后会将dirty变成false，且依赖的值再次变化之后会再将dirty变成true。
  *
  * 2. 计算属性也属于一个effect，依赖的属性会收集当前的effect，当依赖的属性值变化后，会让computedEffect里面dirty变为true。
  *
  * 3. 计算属性具有依赖收集的能力，可以收集对应的effect，依赖的值发生变化后会触发effect的重新执行。
  * */

import { NOOP, isFunction, hasChanged } from '@vue/shared';
import { ReactiveEffect } from './effect';
import { trackRefValue, triggerRefValue } from './ref';

class ComputedRefImpl {
  private _value;
  public effect;
  public dep;

  constructor(getter, private _setter) {
    this.effect = new ReactiveEffect(() => getter(this._value), () => {
      triggerRefValue(this); // 计算属性依赖的值变化了，触发计算属性的渲染effect重新执行
    });
  }

  // 计算属性取值value时进行依赖收集
  get value() {
    if (this.effect.dirty && hasChanged(this._value, this._value = this.effect.run())) {
      triggerRefValue(this);
    }
    trackRefValue(this);
    return this._value;
  }

  // 计算属性赋值时触发依赖更新
  set value(v) {
    this._setter(v);
  }
}

export function computed(getterOrOptions) {
  const onlyGetter = isFunction(getterOrOptions);

  let getter;
  let setter;
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = NOOP;
  } else {
    getter = getterOrOptions?.get;
    setter = getterOrOptions?.set;
  }

  return new ComputedRefImpl(getter, setter);
}