// packages/shared/src/index.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}

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
    // 当前effect是否为响应式的
    this.active = true;
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    const lastActiveEffect = activeEffect;
    try {
      activeEffect = this;
      preClearEffect(this);
      return this.fn();
    } finally {
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
    if (effect2.scheduler) {
      effect2.scheduler();
    }
  }
}

// packages/reactivity/src/reactiveEffect.ts
var targetMap = /* @__PURE__ */ new WeakMap();
function createDep(clearup, key) {
  const dep = /* @__PURE__ */ new Map();
  dep.clearup = clearup;
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
    return Reflect.get(target, key, receiver);
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
export {
  ReactiveEffect,
  activeEffect,
  effect,
  reactive,
  trackEffect,
  triggerEffects
};
//# sourceMappingURL=reactivity.js.map
