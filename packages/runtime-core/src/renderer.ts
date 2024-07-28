import { hasOwn, isUndefined, ShapeFlags, warn } from '@vue/shared';
import { reactive, ReactiveEffect } from '@vue/reactivity';
import getSequence from './seq';
import { Fragment, Text, isSameVNode } from './vnode';
import { queueJob } from './scheduler';

export function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

  /**
   * 递归渲染子节点
   * @param children
   * @param container
   */
  const mountChildren = (children, container) => {
    for (let index = 0; index < children.length; index++) {
      patch(null, children[index], container);
    }
  };

  /**
   * 渲染元素节点
   * @param vnode
   * @param container
   */
  const mountElement = (vnode, container, anchor) => {
    const { type, props, shapeFlag, children } = vnode;

    // 让虚拟节点和真实的dom节点创建关联。
    // 后续更新vnode时，可以和上一次的vnode做比对，之后更新对应的el元素，也可以复用这个dom元素。
    const el = (vnode.el = hostCreateElement(type));

    // 增加属性
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children); // 儿子节点是文本
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el); // 儿子节点是数组
    }

    hostInsert(el, container, anchor);
  };

  /**
   * 比对元素的属性
   * @param oldProps
   * @param newProps
   * @param el
   */
  const patchProps = (oldProps, newProps, el) => {
    // 新的属性需全部生效
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }

    // 老节点有、新节点没有的属性 => 删除
    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };

  /**
   * 卸载子节点
   * @param children
   */
  const unmountChildren = children => {
    for (let index = 0; index < children.length; index++) {
      unmount(children[index]);
    }
  };

  /**
   * 比较两个儿子的差异
   *
   * 先依次从前往后比对，再依次从后往前比对，找到不相同的范围
   *
   * @param c1
   * @param c2
   * @param el
   */
  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // 1. sync from start. 依次从前往后比对 (a b) c => (a b) d e
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

    // 2. sync from end. 依次从后往前比对 (a b) c => d e (b c)
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

    // 3. common sequence + mount. 新的多 && 老的少. 新增的部分为 i-e2 之间的部分.
    // (a b) => (a b) c      i = 2, e1 = 1, e2 = 2
    // (a b) => c (a b)      i = 0, e1 = -1, e2 = 0
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        // 插入锚点
        // 队列尾部插入时，anchor为null，新增的后续节点依次执行appendChildren。
        // 队列头部插入时，anchor为差异部分的第一个，新增的前序节点依次执行insertBefore。【c a b -> d c a b时，d c依次插入到a的前面】
        const anchor = c2[nextPos]?.el;
        while (i <= e2) {
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    }

      // 4. common sequence + unmount. 新的少 && 老的多. 少的部分为 i-e1 之间部分.
      // (a b) c => (a b)     i = 2, e1 = 2, e2 = 1
    // a (b c) => (b c)     i = 0, e1 = 0, e2 = -1
    else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i]);
          i++;
        }
      }
    }

      // 5. unknown sequence.
      // [i ... e1 + 1]: a b [c d e] f g
      // [i ... e2 + 1]: a b [e d c h] f g
    // i = 2, e1 = 4, e2 = 5
    else {
      const s1 = i; // prev starting index
      const s2 = i; // next starting index

      // 1. build key: index map for newChildren.
      // 做一个映射表，用于快速查找。如果老节点的在新的里面还有，那么更新该节点；如果没有就删除该节点。
      const keyToNewIndexMap = new Map();
      const toBePatched = e2 - s2 + 1; // 要倒叙插入的个数
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0); // 新的子节点在老的数组中对应的下标

      for (let index = s2; index <= e2; index++) {
        const vnode = c2[index];
        keyToNewIndexMap.set(vnode.key, index);
      }

      // 2. loop 老的子节点
      // 映射表内找不到的节点：删除；找到的节点：更新
      for (let index = s1; index <= e1; index++) {
        const vnode = c1[index];
        const newIndex = keyToNewIndexMap.get(vnode.key);

        if (isUndefined(newIndex)) {
          unmount(vnode); // 老的子节点在新的映射表内没有找到 => 删除该子节点
        } else {
          newIndexToOldMapIndex[newIndex - s2] = index + 1; // 0代表没有比对过的元素，所有要更新比对的节点值为index+1
          patch(vnode, c2[newIndex], el); // 新的里面有 => 仅对节点进行patch（更新属性、子节点）
        }
      }

      // 3. move and mount. 倒叙插入
      const increasingSeq = getSequence(newIndexToOldMapIndex); // 获取最长的连续递增子序列，这里面的子节点无需移动
      let j = increasingSeq.length - 1;
      for (let index = toBePatched - 1; index >= 0; index--) {
        const newIndex = s2 + index;
        const anchor = c2[newIndex + 1]?.el; // 插入锚点
        const vnode = c2[newIndex];

        if (vnode.el) { // 虚拟节点如果有el属性，说明渲染过，直接插入即可。否则更新
          if (index === increasingSeq[j]) {
            j--; // 在连续递增序列内的子节点，无需移动
          } else {
            hostInsert(vnode.el, el, anchor);
          }
        } else {
          patch(null, vnode, el, anchor);
        }
      }
    }
  };

  /**
   * 比对儿子节点
   * @param n1
   * @param n2
   * @param el
   */
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children;
    const c2 = n2.children;

    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;

    // children has 3 possibilities: text, array or no children.
    // 1.新的是文本，老的是数组移除老的；
    // 2.新的是文本，老的也是文本，内容不相同替换
    // 3.老的是数组，新的是数组，全量 diff 算法
    // 4.老的是数组，新的不是数组，移除老的子节点
    // 5.老的是文本，新的是空
    // 6.老的是文本，新的是数组
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // prev children was array  &  new children is text
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2); // prev children was text/null  &  new children is text
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // prev children was array  &  new children is array
          patchKeyedChildren(c1, c2, el);
        } else { // prev children was array  &  new children has no children
          unmountChildren(c1);
        }
      } else {
        // prev children was text OR null
        // new children is array OR null
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) { // prev children was text  &  new children is array/null
          hostSetElementText(el, '');
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // prev children has no children
          mountChildren(c2, el);
        }
      }
    }
  };

  /**
   * n1和n2是相同节点，dom元素可复用
   * 比对属性和元素的子节点
   * @param n1
   * @param n2
   * @param container
   */
  const patchElement = (n1, n2, container) => {
    const el = (n2.el = n1.el); // 复用dom元素

    const oldProps = n1.props || {};
    const newProps = n2.props || {};

    patchProps(oldProps, newProps, el); // 比对属性

    patchChildren(n1, n2, el); // 比对儿子节点
  };

  /**
   * 处理元素节点
   * @param n1
   * @param n2
   * @param container
   */
  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) {
      // 老的虚拟节点为null，则说明是初始化操作，创建新的元素节点并插入到容器内
      mountElement(n2, container, anchor);
    } else {
      // n1和n2是相同节点 => diff
      patchElement(n1, n2, container);
    }
  };

  /**
   * 初始化props
   * @param instance 组件对象
   * @param rawProps 用户传递的所有属性
   */
  const initProps = (instance, rawProps) => {
    const propsOptions = instance.propsOptions || {}; // 组件接收的属性

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
   * 渲染Component
   * 可以基于自己的状态重新渲染
   * @param vnode
   * @param container
   * @param anchor
   */
  const mountComponent = (vnode, container, anchor) => {
    const {
      render, data = () => {
      }, props: propsOptions = {}
    } = vnode.type;

    const state = reactive(data()); // 组件的状态，响应式的

    const instance = {
      state, // 状态
      vnode: vnode, // 组件的虚拟节点
      subTree: null, // render后生成的子树
      isMounted: false, // 组件是否挂载完成
      update: null as any, // 组件的更新函数
      props: {}, // 组件接收的属性
      attrs: {}, // 用户传递的属性 - 组件接收的属性
      propsOptions: propsOptions, // 用户传递的属性
      proxy: null as any, // 组件代理对象，用来代理data、props、attrs，方便用户访问
      component: null,
    };

    vnode.component = instance;

    // 初始化props
    initProps(instance, vnode.props);

    // 对于一些无法修改的属性，如$attrs、$slots...，因为只读所以proxy代理对象上不会有set方法。当取$attrs时会代理到instance.attrs上。
    // 构建公共属性代理，通过不同的【策略】来访问相应的方法。
    const publicProperty = {
      $attrs: instance => instance.attrs,
    };
    instance.proxy = new Proxy(instance, {
      get(target, key) {
        const { state, props } = target;
        if (state && hasOwn(state, key)) {
          return state[key];
        }
        if (props && hasOwn(props, key)) {
          return props[key];
        }
        const getter = publicProperty[key];
        if (getter) {
          return getter(target);
        }
      },
      set(target, key, value) {
        const { state, props } = target;
        if (state && hasOwn(state, key)) {
          state[key] = value;
          return true;
        }
        if (props && hasOwn(props, key)) {
          warn('props are readonly!');
          return false;
        }
        return true;
      }
    });

    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const subTree = render.call(instance.proxy, instance.proxy);
        patch(null, subTree, container, anchor); // Component渲染完毕之后，el挂载到subTree上（n1.component.subTree.el）
        instance.isMounted = true;
        instance.subTree = subTree;
      } else {
        const subTree = render.call(instance.proxy, instance.proxy);
        patch(instance.subTree, subTree, container, anchor);
        instance.subTree = subTree;
      }
    };

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update)); // 状态变化之后，异步更新

    const update = (instance.update = () => effect.run());

    update();
  };

  /**
   * 处理Component
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   */
  const processComponent = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor);
    } else {
      // todo...
    }
  };

  /**
   * 处理Text组件
   * @param n1
   * @param n2
   * @param container
   */
  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container); // 初始化Text节点，并将该节点插入到容器内
    } else {
      const el = (n2.el = n1.el); // 节点复用
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children); // 更新文本节点
      }
    }
  };

  /**
   * 处理Fragment组件
   * @param n1
   * @param n2
   * @param container
   */
  const processFragment = (n1, n2, container) => {
    if (n1 === null) {
      mountChildren(n2.children, container); // 初始化时渲染n2的子节点
    } else {
      patchChildren(n1, n2, container); // 更新时比对儿子节点
    }
  };

  /**
   * dom diff
   * @param n1
   * @param n2
   * @param container
   */
  const patch = (n1, n2, container, anchor = null) => {
    // 前后两次渲染同一个虚拟元素
    if (n1 === n2) {
      return;
    }

    // n1和n2不是相同节点 => dom元素不可复用。
    // 直接移除老的dom元素、初始化新的dom元素。
    if (n1 && !isSameVNode(n1, n2)) {
      unmount(n1);
      n1 = null;
    }

    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor);
        }
        break;
    }
  };

  /**
   * 卸载dom节点
   * @param vnode
   */
  const unmount = vnode => {
    const { type, children } = vnode;
    if (type === Fragment) { // 卸载Fragment组件
      unmountChildren(children);
    } else {
      hostRemove(vnode.el);
    }
  };

  /**
   * 渲染
   * 将虚拟节点转换成真实节点进行渲染
   *
   * 创建元素节点：n1===null
   * 更新元素节点：n1!==null（容器上有_vnode）
   *
   * @param vnode 虚拟节点
   * @param container 要挂载的容器
   */
  const render = (vnode, container) => {
    if (vnode === null) { // vnode为null时，移除当前dom节点
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container); // dom diff
      container._vnode = vnode; // 渲染时保存上一次的虚拟节点
    }
  };


  return {
    render,
  };
}