import { hasOwn, isFunction, ShapeFlags, warn } from '@vue/shared';
import { proxyRefs, reactive } from '@vue/reactivity';

/**
 * 初始化props
 * @param instance 组件对象
 * @param rawProps 用户传递的所有属性
 */
const initProps = (instance, rawProps) => {
  const propsOptions = instance.propsOptions || {}; // 组件接收的属性定义 { name: String ...}

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

/**
 * 初始化slots
 * @param instance
 * @param children
 */
const initSlots = (instance, children) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children;
  } else {
    instance.slots = {};
  }
};

/**
 * 创建组件实力
 * @param vnode 组件虚拟节点
 */
export function createComponentInstance(vnode) {
  const instance = {
    data: null, // 状态
    vnode: vnode, // 组件的虚拟节点
    subTree: null, // render后生成的子树
    isMounted: false, // 组件是否挂载完成
    update: null as any, // 组件的更新函数
    props: {}, // 组件接收的属性
    attrs: {}, // 用户传递的属性(vnode.props) - 组件接收的属性
    slots: {}, // 插槽
    propsOptions: vnode.type.props, // 组件接收的属性定义（用户声明的哪些属性是组件的属性）
    proxy: null as any, // 组件代理对象，用来代理data、props、attrs，方便用户访问
    component: null, // Component组件跟元素组件不同，复用的是component
    setupState: {}, // setup返回的对象
  };
  return instance;
}

// 对于一些无法修改的属性，如$attrs、$slots...，因为只读所以proxy代理对象上不会有set方法。当取$attrs时会代理到instance.attrs上。
// 构建公共属性代理，通过不同的【策略】来访问相应的方法。
const publicPropertiesMap = {
  $: instance => instance,
  $data: instance => instance.data,
  $attrs: instance => instance.attrs,
  $slots: instance => instance.slots,
};

// 组件数据代理（data、props...）
const PublicInstanceProxyHandlers = {
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
      warn('props are readonly!');
      return false;
    }
    if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value;
      return true;
    }
    return true;
  }
};

/**
 * 给组件实例赋值
 * @param instance
 */
export function setupComponent(instance) {
  const { vnode } = instance;

  // 初始化props
  initProps(instance, vnode.props);

  // 初始化slots。对于component组件来说，子节点就是插槽
  initSlots(instance, vnode.children);

  // 给代理对象赋值
  instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);

  const { data: dataOptions, render, setup } = vnode.type;

  // 处理 setup
  if (setup) {
    const setupContext = {
      slots: instance.slots,
    };
    const setupResult = setup(instance.props, setupContext);
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult); // 给返回的值做ref解包
    }
  }

  // 处理data
  if (dataOptions) {
    if (!isFunction(dataOptions)) {
      warn('The data option must be a function');
    } else {
      instance.data = reactive(dataOptions.call(instance.proxy));
    }
  }

  // setup返回的render函数优先级比外部提供的render函数高
  if (!instance.render) {
    instance.render = render;
  }
}