import { toReactive } from './reactive';
import { activeEffect, trackEffect, triggerEffects } from './effect';
import { createDep } from './reactiveEffect';

/**
 * 把传入的 普通类型值或引用类型对象 统一转换成Proxy对象（{ value: 值 }）
 * 一般情况下是对象直接用reactive更合理
 * @param value
 */
export function ref(value) {
  return createRef(value);
}

/**
 * 创建ref实例
 * @param value
 */
function createRef(value) {
  return new RefImpl(value);
}

class RefImpl {
  public __v_isRef = true; // 是否为Ref的标识
  public _value; // 用来保存ref的值
  public dep; // 用于收集对应的effect

  constructor(public rawValue) {
    this._value = toReactive(rawValue);
  }

  // 属性访问器。访问value时会代理到_value上
  get value() {
    trackRefValue(this); // 依赖收集
    return this._value;
  }

  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue;
      this._value = toReactive(newValue);
      triggerRefValue(this); // 触发更新
    }
  }
}

/**
 * 收集ref依赖
 * @param ref
 */
function trackRefValue(ref) {
  if (activeEffect) {
    ref.dep = ref.dep || createDep(() => { ref.dep = undefined }, 'undefined');

    trackEffect(
      activeEffect,
      ref.dep
    );
  }
}

/**
 * 触发ref依赖更新
 * @param ref
 */
function triggerRefValue(ref) {
  const dep = ref.dep;
  if (dep) {
    triggerEffects(dep);
  }
}

/**
 * 判断是否是ref实例
 * @param value
 */
export function isRef(value) {
  return value && (value.__v_isRef === true);
}
