import { isReactive, toReactive } from './reactive';
import { activeEffect, trackEffect, triggerEffects } from './effect';
import { createDep } from './reactiveEffect';
import { isObject } from "@vue/shared";
import { Ref } from "vue";

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
    this._value = toReactive(rawValue); // 如果rawValue是对象类型，那么这个对象会变为响应式对象。这意味着对象的属性可以被追踪，并且这些属性变化时能够自动更新试图。
  }

  // 属性访问器。访问value时会代理到_value上
  get value() {
    trackRefValue(this); // 依赖收集
    return this._value; // 针对对象数据类型，此处返回的是该对象的proxy代理（响应式）；简单数据类型直接返回原始值。
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
    ref.dep = ref.dep || createDep(() => {
      ref.dep = undefined
    }, 'undefined');

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
 * 将目标值转成ref
 * @param source
 * @param key
 */
export function toRef(source, key) {
  if (isRef(source)) {
    return source;
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key);
  } else {
    return ref(source);
  }
}

export function toRefs(object) {
  const ret = {};
  for (let key in object) {
    ret[key] = propertyToRef(object, key);
  }
  return ret;
}

function propertyToRef(source, key) {
  const val = source[key];
  if (isRef(val)) {
    return val;
  }
  return new ObjectRefImpl(source, key);
}

class ObjectRefImpl {
  public __v_isRef = true;

  constructor(public _object, public _key) {
  }

  get value() {
    return this._object[this._key];
  }

  set value(newValue) {
    this._object[this._key] = newValue;
  }

}

/**
 * 判断是否是ref实例
 * @param value
 */
export function isRef(value) {
  return value && (value.__v_isRef === true);
}

/**
 * ref 解包
 * @param ref
 */
export function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}

const shallowUnwrapHandlers = {
  get(target, key, receiver) {
    return unref(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value ,receiver);
    }
  },
};

/**
 * 返回给定对象的响应式代理。
 * @param objectWithRef
 */
export function proxyRefs(objectWithRef) {
  if (isReactive(objectWithRef)) {
    return objectWithRef;
  }
  return new Proxy(objectWithRef, shallowUnwrapHandlers);
}
