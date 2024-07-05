// packages/shared/src/index.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}

// packages/reactivity/src/effect.ts
var activeEffect;
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
}
var ReactiveEffect = class {
  /**
   * 构造函数
   * @param fn 用户自定义回调函数
   * @param scheduler
   */
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    /**
     * 当前effect是否为响应式的
     */
    this.active = true;
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    const lastActiveEffect = activeEffect;
    try {
      activeEffect = this;
      return this.fn();
    } finally {
      activeEffect = lastActiveEffect;
    }
  }
};

// packages/reactivity/src/reactiveEffect.ts
function track(target, key) {
  if (activeEffect) {
    console.log(target, key);
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
    return Reflect.set(target, key, value, receiver);
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
  reactive
};
//# sourceMappingURL=reactivity.js.map
