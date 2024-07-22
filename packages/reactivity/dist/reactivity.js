// packages/shared/src/index.ts
var NOOP = () => {
};
function isObject(value) {
  return value !== null && typeof value === "object";
}
function isFunction(value) {
  return typeof value === "function";
}
var isArray = Array.isArray;
function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}
var objectToString = Object.prototype.toString;
var toTypeString = (value) => objectToString.call(value);
var isPlainObject = (value) => toTypeString(value) === "[object Object]";
var isMap = (value) => toTypeString(value) === "[object Map]";
var isSet = (value) => toTypeString(value) === "[object Set]";

// packages/reactivity/src/effect.ts
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size === 0) {
    dep.clearup();
  }
}
function preClearEffect(effect2) {
  effect2._depsLength = 0;
  effect2._trackId++;
}
function postClearEffect(effect2) {
  if (effect2.deps.length > effect2._depsLength) {
    for (let index = effect2._depsLength; index < effect2.deps.length; index++) {
      cleanDepEffect(effect2.deps[index], effect2);
    }
    effect2.deps.length = effect2._depsLength;
  }
}
var activeEffect;
var ReactiveEffect = class {
  /**
   * 构造函数
   * @param fn 用户自定义回调函数
   * @param scheduler 用户自定义调度
   */
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    // 记录当前effect执行的次数（防止一个属性在当前effect中多次依赖收集）
    this._trackId = 0;
    // 收集当前effect的deps个数
    this._depsLength = 0;
    // 收集当前effect的deps数组（哪些个属性被当前effect依赖）
    this.deps = [];
    // 当前effect是否正在运行中
    this._running = 0;
    // 是否为脏值
    this._dirtyLevel = 4 /* Dirty */;
    // 当前effect是否为响应式的
    this.active = true;
  }
  get dirty() {
    return this._dirtyLevel === 4 /* Dirty */;
  }
  set dirty(v) {
    this._dirtyLevel = v ? 4 /* Dirty */ : 0 /* NoDirty */;
  }
  run() {
    this._dirtyLevel = 0 /* NoDirty */;
    if (!this.active) {
      return this.fn();
    }
    const lastActiveEffect = activeEffect;
    try {
      activeEffect = this;
      preClearEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postClearEffect(this);
      activeEffect = lastActiveEffect;
    }
  }
};
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
  if (options) {
    Object.assign(_effect, options);
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
function trackEffect(effect2, dep) {
  if (dep.get(effect2) !== effect2._trackId) {
    dep.set(effect2, effect2._trackId);
    const oldDep = effect2.deps[effect2._depsLength];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect2);
      }
      effect2.deps[effect2._depsLength++] = dep;
    } else {
      effect2._depsLength++;
    }
  }
}
function triggerEffects(dep) {
  for (const effect2 of dep.keys()) {
    if (effect2._dirtyLevel < 4 /* Dirty */) {
      effect2._dirtyLevel = 4 /* Dirty */;
    }
    if (!effect2._running) {
      if (effect2.scheduler) {
        effect2.scheduler();
      }
    }
  }
}

// packages/reactivity/src/reactiveEffect.ts
var targetMap = /* @__PURE__ */ new WeakMap();
function createDep(cleanup, key) {
  const dep = /* @__PURE__ */ new Map();
  dep.cleanup = cleanup;
  dep.key = key;
  return dep;
}
function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(
        key,
        dep = createDep(() => depsMap.delete(key), key)
        // 用于清理target上不需要的属性
      );
    }
    trackEffect(activeEffect, dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  const depMap = targetMap.get(target);
  if (!depMap) {
    return;
  }
  const dep = depMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}

// packages/reactivity/src/baseHandler.ts
var mutableHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    const result = Reflect.get(target, key, receiver);
    if (isObject(result)) {
      return reactive(result);
    }
    return result;
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    const result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return result;
  }
};

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
function createReactiveObject(target) {
  if (!isObject(target)) {
    return target;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const existProxy = reactiveMap.get(target);
  if (existProxy) {
    return existProxy;
  }
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
function reactive(target) {
  return createReactiveObject(target);
}
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return createRef(value);
}
function createRef(value) {
  return new RefImpl(value);
}
var RefImpl = class {
  // 用于收集对应的effect
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  // 属性访问器。访问value时会代理到_value上
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue;
      this._value = toReactive(newValue);
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (activeEffect) {
    ref2.dep = ref2.dep || createDep(() => {
      ref2.dep = void 0;
    }, "undefined");
    trackEffect(
      activeEffect,
      ref2.dep
    );
  }
}
function triggerRefValue(ref2) {
  const dep = ref2.dep;
  if (dep) {
    triggerEffects(dep);
  }
}
function toRef(source, key) {
  if (isRef(source)) {
    return source;
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key);
  } else {
    return ref(source);
  }
}
function toRefs(object) {
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
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function isRef(value) {
  return value && value.__v_isRef === true;
}
function unref(ref2) {
  return isRef(ref2) ? ref2.value : ref2;
}
var shallowUnwrapHandlers = {
  get(target, key, receiver) {
    return unref(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  }
};
function proxyRefs(objectWithRef) {
  if (isReactive(objectWithRef)) {
    return objectWithRef;
  }
  return new Proxy(objectWithRef, shallowUnwrapHandlers);
}

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(getter, _setter) {
    this._setter = _setter;
    this.effect = new ReactiveEffect(() => getter(this._value), () => {
      triggerRefValue(this);
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
};
function computed(getterOrOptions) {
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

// packages/reactivity/src/apiWacth.ts
function watch(source, cb, options) {
  doWatch(source, cb, options);
}
function watchEffect(source, options) {
  doWatch(source, null, options);
}
function doWatch(source, cb, { deep, immediate } = {}) {
  const reactiveGetter = (source2) => deep === true ? source2 : traverse(source2, deep === false ? 1 : void 0);
  let getter;
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isFunction(source)) {
    getter = source;
  } else if (isArray(source)) {
    getter = () => {
      return source.map((s) => {
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
  let clean;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = void 0;
    };
  };
  const job = () => {
    if (cb) {
      const newValue = effect2.run();
      if (clean) {
        clean();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect2.run();
    }
  } else {
    effect2.run();
  }
}
function traverse(value, depth = Infinity, seen) {
  if (!isObject(value) || depth <= 0) {
    return value;
  }
  seen = seen || /* @__PURE__ */ new Set();
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
    value.forEach((v) => {
      traverse(v, depth, seen);
    });
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen);
    }
  }
  return value;
}
export {
  ReactiveEffect,
  activeEffect,
  computed,
  effect,
  isReactive,
  isRef,
  proxyRefs,
  reactive,
  ref,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffects,
  triggerRefValue,
  unref,
  watch,
  watchEffect
};
//# sourceMappingURL=reactivity.js.map
