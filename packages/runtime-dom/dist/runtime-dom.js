// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null);
  },
  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement: (type) => {
    return document.createElement(type);
  },
  createText: (text) => {
    return document.createTextNode(text);
  },
  setText: (node, text) => {
    node.nodeValue = text;
  },
  setElementText: (el, text) => {
    el.textContent = text;
  },
  parentNode: (node) => {
    return node.parentNode;
  },
  nextSibling: (node) => {
    return node.nextSibling;
  }
};

// packages/shared/src/index.ts
var hasOwnProperty = Object.prototype.hasOwnProperty;
var hasOwn = (value, key) => hasOwnProperty.call(value, key);
var warn = console.warn;
var NOOP = () => {
};
function isUndefined(value) {
  return value === void 0;
}
function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number";
}
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
var isOn = (key) => {
  return key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && (key.charCodeAt(2) > 122 || key.charCodeAt(2) < 97);
};

// packages/runtime-dom/src/modules/class.ts
function patchClass(el, value) {
  if (value === null) {
    el.className = null;
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
}

// packages/runtime-dom/src/modules/style.ts
function patchStyle(el, prevValue, nextValue) {
  const style = el.style;
  for (let key in nextValue) {
    style[key] = nextValue[key];
  }
  for (const key in prevValue) {
    if (nextValue && (nextValue[key] === null || nextValue[key] === void 0)) {
      style[key] = null;
    }
  }
}

// packages/runtime-dom/src/modules/events.ts
function createInvoker(value) {
  const invoker = (e) => invoker.value(e);
  invoker.value = value;
  return invoker;
}
function patchEvent(el, name, nextValue) {
  const invokers = el._evi || (el._evi = {});
  const existingInvoker = invokers[name];
  const eventName = name.slice(2).toLowerCase();
  if (nextValue && !existingInvoker) {
    const invoker = invokers[name] = createInvoker(nextValue);
    el.addEventListener(eventName, invoker);
    return;
  }
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
    return;
  }
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker);
    invokers[name] = void 0;
  }
}

// packages/runtime-dom/src/modules/attrs.ts
function patchAttr(el, key, value) {
  if (value === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

// packages/runtime-dom/src/patchProp.ts
function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    patchClass(el, nextValue);
  } else if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  } else if (isOn(key)) {
    patchEvent(el, key, nextValue);
  } else {
    patchAttr(el, key, nextValue);
  }
}

// packages/reactivity/src/effect.ts
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size === 0) {
    dep.cleanup();
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
  stop() {
    if (this.active) {
      this.active = false;
      preClearEffect(this);
      postClearEffect(this);
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
  return doWatch(source, cb, options);
}
function watchEffect(source, options) {
  return doWatch(source, null, options);
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
  const unwatch = () => {
    effect2.stop();
  };
  return unwatch;
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

// packages/runtime-core/src/seq.ts
function getSequence(arr) {
  const result = [0];
  const p = result.slice(0);
  let start;
  let end;
  let middle;
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      let resultLastIndex = result[result.length - 1];
      if (arrI > arr[resultLastIndex]) {
        p[i] = result[result.length - 1];
        result.push(i);
        continue;
      }
    }
    start = 0;
    end = result.length - 1;
    while (start < end) {
      middle = (start + end) / 2 | 0;
      if (arr[result[middle]] < arrI) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }
    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1];
      result[start] = i;
    }
  }
  let l = result.length;
  let last = result[l - 1];
  while (l-- > 0) {
    result[l] = last;
    last = p[last];
  }
  return result;
}

// packages/runtime-core/src/vnode.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
function isSameVNode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    shapeFlag,
    key: props?.key,
    // 用于diff算法比对
    el: null,
    // 虚拟节点对应的真实节点
    ref: props?.ref
    // 元素：dom元素  组件：实例/exposed
  };
  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
    } else if (isObject(children)) {
      vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
    } else {
      vnode.children = String(children);
      vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
  }
  return vnode;
}

// packages/runtime-core/src/scheduler.ts
var queue = [];
var resolvePromise = Promise.resolve();
var isFlushing = false;
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      const copyQueue = queue.slice(0);
      queue.length = 0;
      copyQueue.forEach((job2) => job2());
      copyQueue.length = 0;
    });
  }
}

// packages/runtime-core/src/component.ts
var initProps = (instance, rawProps) => {
  const propsOptions = instance.propsOptions || {};
  const props = {};
  const attrs = {};
  if (rawProps) {
    for (const key in rawProps) {
      if (key in propsOptions) {
        props[key] = rawProps[key];
      } else {
        attrs[key] = rawProps[key];
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
};
var initSlots = (instance, children) => {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    instance.slots = children;
  } else {
    instance.slots = {};
  }
};
function createComponentInstance(vnode, parent) {
  const instance = {
    data: null,
    // 状态
    vnode,
    // 组件的虚拟节点
    subTree: null,
    // render后生成的子树
    isMounted: false,
    // 组件是否挂载完成
    update: null,
    // 组件的更新函数
    props: {},
    // 组件接收的属性
    attrs: {},
    // 用户传递的属性(vnode.props) - 组件接收的属性
    slots: {},
    // 插槽
    propsOptions: vnode.type.props,
    // 组件接收的属性定义（用户声明的哪些属性是组件的属性）
    proxy: null,
    // 组件代理对象，用来代理data、props、attrs，方便用户访问
    component: null,
    // Component组件跟元素组件不同，复用的是component
    setupState: {},
    // setup返回的对象
    exposed: null,
    // 组件通过expose暴露出来的对象
    parent,
    // 组件的父级
    provides: parent ? parent.provides : /* @__PURE__ */ Object.create(null)
    // 构建provides（如果子组件没有单独提供provide数据，那么当前组件的provide数据和父组件复用同一份）
  };
  return instance;
}
var publicPropertiesMap = {
  $: (instance) => instance,
  $data: (instance) => instance.data,
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
};
var PublicInstanceProxyHandlers = {
  get(target, key) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    }
    if (props && hasOwn(props, key)) {
      return props[key];
    }
    if (setupState && hasOwn(setupState, key)) {
      return setupState[key];
    }
    const getter = publicPropertiesMap[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
      return true;
    }
    if (props && hasOwn(props, key)) {
      warn("props are readonly!");
      return false;
    }
    if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value;
      return true;
    }
    return true;
  }
};
function setupComponent(instance) {
  const { vnode } = instance;
  initProps(instance, vnode.props);
  initSlots(instance, vnode.children);
  instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);
  const { data: dataOptions, render: render2, setup } = vnode.type;
  if (setup) {
    const setupContext = {
      attrs: instance.attrs,
      slots: instance.slots,
      emit(event, ...payload) {
        const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`;
        const handler = instance.vnode.props[eventName];
        handler && handler(...payload);
      },
      expose(value) {
        instance.exposed = value;
      }
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, setupContext);
    unsetCurrentInstance();
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
    }
  }
  if (dataOptions) {
    if (!isFunction(dataOptions)) {
      warn("The data option must be a function");
    } else {
      instance.data = reactive(dataOptions.call(instance.proxy));
    }
  }
  if (!instance.render) {
    instance.render = render2;
  }
}
var currentInstance = null;
var getCurrentInstance = () => {
  return currentInstance;
};
var setCurrentInstance = (instance) => {
  currentInstance = instance;
};
var unsetCurrentInstance = () => {
  currentInstance = null;
};

// packages/runtime-core/src/apiLifecycle.ts
var LifecycleHooks = /* @__PURE__ */ ((LifecycleHooks2) => {
  LifecycleHooks2["BEFORE_MOUNT"] = "bm";
  LifecycleHooks2["MOUNTED"] = "m";
  LifecycleHooks2["BEFORE_UPDATE"] = "bu";
  LifecycleHooks2["UPDATED"] = "u";
  return LifecycleHooks2;
})(LifecycleHooks || {});
function createHook(lifecycle) {
  return (hook, instance = currentInstance) => {
    if (instance) {
      const hooks = instance[lifecycle] || (instance[lifecycle] = []);
      const wrapHook = () => {
        setCurrentInstance(instance);
        hook.call(instance);
        unsetCurrentInstance();
      };
      hooks.push(wrapHook);
    }
  };
}
var onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
var onUpdated = createHook("u" /* UPDATED */);
var invokeArrayFns = (hooks) => {
  for (let index = 0; index < hooks.length; index++) {
    hooks[index]();
  }
};

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions2) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions2;
  const normalize = (children) => {
    if (isArray(children)) {
      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (isString(child) || isNumber(child)) {
          children[index] = createVNode(Text, null, String(child));
        }
      }
    }
    return children;
  };
  const mountChildren = (children, container, anchor, parentComponent) => {
    normalize(children);
    for (let index = 0; index < children.length; index++) {
      patch(null, children[index], container, anchor, parentComponent);
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, props, shapeFlag, children } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el, anchor, parentComponent);
    }
    hostInsert(el, container, anchor);
  };
  const patchProps = (oldProps, newProps, el) => {
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };
  const unmountChildren = (children, parentComponent) => {
    for (let index = 0; index < children.length; index++) {
      unmount(children[index], parentComponent);
    }
  };
  const patchKeyedChildren = (c1, c2, el, parentComponent) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }
    while (e1 >= i && e2 >= i) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = c2[nextPos]?.el;
        while (i <= e2) {
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i], parentComponent);
          i++;
        }
      }
    } else {
      const s1 = i;
      const s2 = i;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      const toBePatched = e2 - s2 + 1;
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0);
      for (let index = s2; index <= e2; index++) {
        const vnode = c2[index];
        keyToNewIndexMap.set(vnode.key, index);
      }
      for (let index = s1; index <= e1; index++) {
        const vnode = c1[index];
        const newIndex = keyToNewIndexMap.get(vnode.key);
        if (isUndefined(newIndex)) {
          unmount(vnode, parentComponent);
        } else {
          newIndexToOldMapIndex[newIndex - s2] = index + 1;
          patch(vnode, c2[newIndex], el);
        }
      }
      const increasingSeq = getSequence(newIndexToOldMapIndex);
      let j = increasingSeq.length - 1;
      for (let index = toBePatched - 1; index >= 0; index--) {
        const newIndex = s2 + index;
        const anchor = c2[newIndex + 1]?.el;
        const vnode = c2[newIndex];
        if (vnode.el) {
          if (index === increasingSeq[j]) {
            j--;
          } else {
            hostInsert(vnode.el, el, anchor);
          }
        } else {
          patch(null, vnode, el, anchor);
        }
      }
    }
  };
  const patchChildren = (n1, n2, el, anchor, parentComponent) => {
    const c1 = n1.children;
    const c2 = normalize(n2.children);
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1, parentComponent);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(c1, c2, el, parentComponent);
        } else {
          unmountChildren(c1, parentComponent);
        }
      } else {
        if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(el, "");
        }
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(c2, el, anchor, parentComponent);
        }
      }
    }
  };
  const patchElement = (n1, n2, container, anchor, parentComponent) => {
    const el = n2.el = n1.el;
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    patchProps(oldProps, newProps, el);
    patchChildren(n1, n2, el, anchor, parentComponent);
  };
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, container, anchor, parentComponent);
    }
  };
  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next;
    updateProps(instance, instance.props, next.props);
  };
  const renderComponent = (instance) => {
    const { vnode, render: render3, proxy, attrs } = instance;
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      return render3.call(proxy, proxy);
    } else {
      return vnode.type(attrs);
    }
  };
  const setupRenderEffect = (instance, container, anchor) => {
    const { render: render3 } = instance;
    const componentUpdateFn = () => {
      const { bm, m } = instance;
      if (!instance.isMounted) {
        if (bm) {
          invokeArrayFns(bm);
        }
        setCurrentInstance(instance);
        const subTree = renderComponent(instance);
        unsetCurrentInstance();
        patch(null, subTree, container, anchor, instance);
        instance.isMounted = true;
        instance.subTree = subTree;
        if (m) {
          invokeArrayFns(m);
        }
      } else {
        const { next, bu, u } = instance;
        if (next) {
          updateComponentPreRender(instance, next);
        }
        if (bu) {
          invokeArrayFns(bu);
        }
        setCurrentInstance(instance);
        const subTree = renderComponent(instance);
        unsetCurrentInstance();
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArrayFns(u);
        }
      }
    };
    const effect2 = new ReactiveEffect(componentUpdateFn, () => queueJob(update));
    const update = instance.update = () => effect2.run();
    update();
  };
  const mountComponent = (vnode, container, anchor, parentComponent) => {
    const instance = vnode.component = createComponentInstance(vnode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor);
  };
  const hasPropsChange = (prevProps, nextProps) => {
    if (prevProps === nextProps) {
      return false;
    }
    const prevPropsLength = Object.keys(prevProps).length;
    const nextPropsLength = Object.keys(nextProps).length;
    if (prevPropsLength !== nextPropsLength) {
      return true;
    }
    for (const key in nextProps) {
      if (!hasOwn(prevProps, key) || prevProps[key] !== nextProps[key]) {
        return true;
      }
    }
    return false;
  };
  const updateProps = (instance, prevProps, nextProps) => {
    if (hasPropsChange(prevProps, nextProps)) {
      for (const key in nextProps) {
        instance.props[key] = nextProps[key];
      }
      for (const key in instance.props) {
        if (!hasOwn(nextProps, key)) {
          delete prevProps[key];
        }
      }
    }
  };
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;
    if (prevChildren || nextChildren) {
      return true;
    }
    return hasPropsChange(prevProps, nextProps);
  };
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor, parentComponent);
    } else {
      updateComponent(n1, n2);
    }
  };
  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert(n2.el = hostCreateText(n2.children), container);
    } else {
      const el = n2.el = n1.el;
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountChildren(n2.children, container, anchor, parentComponent);
    } else {
      patchChildren(n1, n2, container, anchor, parentComponent);
    }
  };
  const setRef = (rawRef, vnode) => {
    const value = vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */ ? vnode.component.exposed || vnode.component.proxy : vnode.el;
    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  };
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVNode(n1, n2)) {
      unmount(n1, parentComponent);
      n1 = null;
    }
    const { type, shapeFlag, ref: ref2 } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor, parentComponent);
        }
        break;
    }
    if (ref2 !== null) {
      setRef(ref2, n2);
    }
  };
  const unmount = (vnode, parentComponent = null) => {
    const { type, shapeFlag, children } = vnode;
    if (type === Fragment) {
      unmountChildren(children, parentComponent);
    } else if (shapeFlag & 6 /* COMPONENT */) {
      unmount(vnode.component.subTree, parentComponent);
    } else {
      hostRemove(vnode.el);
    }
  };
  const render2 = (vnode, container) => {
    if (vnode === null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      } else {
        return createVNode(type, propsOrChildren);
      }
    } else {
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-core/src/apiProvide.ts
function provide(key, value) {
  if (!currentInstance) {
    return;
  }
  const parentProvides = currentInstance.parent?.provides;
  let provides = currentInstance.provides;
  if (parentProvides === provides) {
    provides = currentInstance.provides = Object.create(provides);
  }
  provides[key] = value;
}
function inject(key, defaultValue) {
  if (!currentInstance) {
    return;
  }
  const provides = currentInstance.parent?.provides;
  if (provides && key in provides) {
    return provides[key];
  } else {
    return defaultValue;
  }
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign({ patchProp }, nodeOps);
var render = function(vnode, container) {
  return createRenderer(renderOptions).render(vnode, container);
};
export {
  Fragment,
  LifecycleHooks,
  ReactiveEffect,
  Text,
  activeEffect,
  computed,
  createComponentInstance,
  createRenderer,
  createVNode,
  currentInstance,
  effect,
  getCurrentInstance,
  h,
  inject,
  invokeArrayFns,
  isReactive,
  isRef,
  isSameVNode,
  isVNode,
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  provide,
  proxyRefs,
  reactive,
  ref,
  render,
  setCurrentInstance,
  setupComponent,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffects,
  triggerRefValue,
  unref,
  unsetCurrentInstance,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.js.map
