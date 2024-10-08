import { logger, hasOwn, isArray, isNumber, isString, isUndefined, PatchFlags, ShapeFlags } from '@vue/shared';
import { isRef, ReactiveEffect } from '@vue/reactivity';
import getSequence from './seq';
import { Fragment, Text, isSameVNode, createVNode, Comment } from './vnode';
import { queueJob } from './scheduler';
import { createComponentInstance, setCurrentInstance, setupComponent, unsetCurrentInstance } from './component';
import { invokeArrayFns } from './apiLifecycle';
import { isKeepAlive } from './components/KeepAlive';

export function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

  /**
   * 子组件是数组，将 字符串/数字 的子组件转成Text组件
   * @param children
   */
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

  /**
   * 递归渲染子节点
   * @param children
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const mountChildren = (children, container, anchor, parentComponent) => {
    normalize(children);

    for (let index = 0; index < children.length; index++) {
      patch(null, children[index], container, anchor, parentComponent);
    }
  };

  /**
   * 渲染元素节点
   * @param vnode
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, props, shapeFlag, children, transition } = vnode;

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
      mountChildren(children, el, anchor, parentComponent); // 儿子节点是数组
    }

    if (transition) {
      transition.beforeEnter(el);
    }

    hostInsert(el, container, anchor);

    if (transition) {
      transition.enter(el);
    }
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
   * 比较两个儿子的差异
   *
   * 先依次从前往后比对，再依次从后往前比对，找到不相同的范围
   *
   * @param c1
   * @param c2
   * @param el
   * @param parentComponent
   */
  const patchKeyedChildren = (c1, c2, el, parentComponent) => {
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
          unmount(c1[i], parentComponent);
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
          unmount(vnode, parentComponent); // 老的子节点在新的映射表内没有找到 => 删除该子节点
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
   * @param anchor
   * @param parentComponent
   */
  const patchChildren = (n1, n2, el, anchor, parentComponent) => {
    const c1 = n1.children;
    const c2 = normalize(n2.children);

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
        unmountChildren(c1, parentComponent);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2); // prev children was text/null  &  new children is text
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // prev children was array  &  new children is array
          patchKeyedChildren(c1, c2, el, parentComponent);
        } else { // prev children was array  &  new children has no children
          unmountChildren(c1, parentComponent);
        }
      } else {
        // prev children was text OR null
        // new children is array OR null
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) { // prev children was text  &  new children is array/null
          hostSetElementText(el, '');
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // prev children has no children
          mountChildren(c2, el, anchor, parentComponent);
        }
      }
    }
  };

  /**
   * 线性比对 dynamicChildren
   * @param n1
   * @param n2
   * @param el
   * @param anchor
   * @param parentComponent
   */
  const patchBlockChildren = (n1, n2, el, anchor, parentComponent) => {
    for (let index = 0; index < n2.dynamicChildren.length; index++) {
      patch(
        n1.dynamicChildren[index],
        n2.dynamicChildren[index],
        el,
        anchor,
        parentComponent
      );
    }
  };

  /**
   * n1和n2是相同节点，dom元素可复用
   * 比对属性和元素的子节点
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const patchElement = (n1, n2, container, anchor, parentComponent) => {
    const el = (n2.el = n1.el); // 复用dom元素

    const oldProps = n1.props || {};
    const newProps = n2.props || {};

    const { patchFlag, dynamicChildren } = n2;

    if (patchFlag > 0) {
      // the presence of a patchFlag means this element's render code was generated by the compiler and can take the fast path.
      // in this path old node and new node are guaranteed to have the same shape
      // (i.e. at the exact same position in the source template)
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          hostPatchProp(el, 'class', oldProps.class, newProps.class);
        }
      }
      if (patchFlag & PatchFlags.STYLE) {
        hostPatchProp(el, 'style', oldProps.style, newProps.style);
      }
      if (patchFlag & PatchFlags.PROPS) {
        // if the flag is present then dynamicProps must be non-null
        const propsToUpdate = n2.dynamicProps!;
        for (let index = 0; index < propsToUpdate.length; index++) {
          const key = propsToUpdate[index];
          const prev = oldProps[key];
          const next = newProps[key];
          hostPatchProp(el, key, prev, next);
        }
      }
      if (patchFlag & PatchFlags.TEXT) {
        if (n1.children != n2.children) {
          return hostSetElementText(n2.el, n2.children);
        }
      }
    } else if (dynamicChildren === null) { // dynamicChildren如果不为null，或者patchFlag > 0，则说明是经过compiler编译。dynamicChildren为null，说明不是经过编译器编译的。
      logger('props 全量diff', el);
      patchProps(oldProps, newProps, el); // 比对属性
    }

    if (dynamicChildren) {
      logger('children: 线性diff');
      patchBlockChildren(n1, n2, el, anchor, parentComponent);
    } else {
      logger('children: 全量diff.(full diff)');
      patchChildren(n1, n2, el, anchor, parentComponent); // 比对儿子节点
    }
  };

  /**
   * 处理元素节点
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      // 老的虚拟节点为null，则说明是初始化操作，创建新的元素节点并插入到容器内
      mountElement(n2, container, anchor, parentComponent);
    } else {
      // n1和n2是相同节点 => diff
      patchElement(n1, n2, container, anchor, parentComponent);
    }
  };

  /**
   * 基于 属性/插槽 的更新
   * @param instance
   * @param next
   */
  const updateComponentPreRender = (instance, next) => {
    instance.next = null; // 清空next属性
    instance.vnode = next; // 更新新的虚拟节点
    updateProps(instance, instance.props, next.props); // 更新props
    Object.assign(instance.slots, next.children); // 更新插槽
  };

  /**
   * 渲染组件
   * @param instance
   */
  const renderComponent = instance => {
    const { vnode, render, proxy, attrs, slots } = instance;
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy);
    } else {
      return vnode.type(attrs, { slots }); // 渲染函数式组件（函数式组件不建议使用，因为没有任何性能优化）
    }
  };

  /**
   * 创建组件effect
   * @param instance
   * @param container
   * @param anchor
   */
  const setupRenderEffect = (instance, container, anchor) => {
    const { render } = instance;

    // 组件更新逻辑。组件自身的状态(data)发生变化直接走该逻辑，外界传递的props的变化会先更新instance.props再走该逻辑。
    const componentUpdateFn = () => {
      const { bm, m } = instance;

      if (!instance.isMounted) {
        // onBeforeMount
        if (bm) {
          invokeArrayFns(bm);
        }

        setCurrentInstance(instance);
        const subTree = renderComponent(instance);
        unsetCurrentInstance();

        patch(null, subTree, container, anchor, instance); // Component渲染完毕之后，el挂载到subTree上（n1.component.subTree.el）
        instance.isMounted = true;
        instance.subTree = subTree;

        // onMounted
        if (m) {
          invokeArrayFns(m);
        }
      } else {
        const { next, bu, u } = instance;

        if (next) {
          /* 有next属性，说明是属性或者插槽更新 */
          updateComponentPreRender(instance, next);
        }

        // onBeforeUpdate
        if (bu) {
          invokeArrayFns(bu);
        }

        setCurrentInstance(instance);
        const subTree = renderComponent(instance);
        unsetCurrentInstance();

        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;

        // onUpdated
        if (u) {
          invokeArrayFns(u);
        }
      }
    };

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update)); // 状态变化之后，异步更新

    const update = (instance.update = () => effect.run());

    update();
  };

  /**
   * 渲染Component
   * 可以基于自己的状态重新渲染
   * @param vnode
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const mountComponent = (vnode, container, anchor, parentComponent) => {
    // 1. 创建组件实例
    const instance = (vnode.component = createComponentInstance(vnode, parentComponent));

    if (isKeepAlive(vnode)) {
      instance.ctx.renderer = {
        createElement: hostCreateElement, // 内部需要创建一个div来缓存dom
        unmount: unmount, // 缓存个数超过最大限制时，组件切换时需要将现在容器中的元素移除
        move(vnode, container, anchor) {
          hostInsert(vnode.component.subTree.el, container, anchor); // 把之前渲染好的dom元素放入到临时容器中
        },
      };
    }

    // 2. 给实例组件赋值
    setupComponent(instance);

    // 3. 创建组件effect
    setupRenderEffect(instance, container, anchor);
  };

  /**
   * 比对前后属性是否发生变化
   * @param prevProps
   * @param nextProps
   */
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

  /**
   * 更新props
   * @param instance
   * @param prevProps
   * @param nextProps
   */
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

  /**
   * 监测组件是否需要重新渲染
   * @param n1
   * @param n2
   */
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;

    // 有插槽，直接走重新渲染
    if (prevChildren || nextChildren) {
      return true;
    }

    // 属性不一致，重新渲染
    return hasPropsChange(prevProps, nextProps);
  };

  /**
   * 组件更新
   * @param n1
   * @param n2
   */
  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component); // 复用组件实例

    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2; // 调用update时如果有next属性，则说明是属性更新，否则是状态更新
      instance.update(); // 统一组件更新逻辑
    }
  };

  /**
   * 处理Component
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        parentComponent.ctx.activate(n2, container, anchor); // KeepAlive组件的重新挂载逻辑，把之前渲染好的dom元素移动到容器内
      } else {
        mountComponent(n2, container, anchor, parentComponent); // 组件初渲染
      }
    } else {
      updateComponent(n1, n2); // 组件更新（基于 属性/插槽 的更新）
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
   * 处理注释
   * @param n1
   * @param n2
   * @param container
   */
  const processComment = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateComment(n2.children || '')), container);
    } else {
      n2.el = n1.el; // there's no support for dynamic comments
    }
  };

  /**
   * 处理Fragment组件
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountChildren(n2.children, container, anchor, parentComponent); // 初始化时渲染n2的子节点
    } else {
      patchChildren(n1, n2, container, anchor, parentComponent); // 更新时比对儿子节点
    }
  };

  /**
   * 设置ref
   * 1. 如果ref放在组件上，那么ref就是组件的(exposed || proxy代理对象)。
   * 2. 如果ref放在dom上，那么ref就是dom元素
   * @param rawRef
   * @param vnode
   */
  const setRef = (rawRef, vnode) => {
    const value = vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? vnode.component.exposed || vnode.component.proxy
      : vnode.el;

    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  };

  /**
   * dom diff
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   * @param parentComponent
   */
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    // 前后两次渲染同一个虚拟元素
    if (n1 === n2) {
      return;
    }

    // n1和n2不是相同节点 => dom元素不可复用。
    // 直接移除老的dom元素、初始化新的dom元素。
    if (n1 && !isSameVNode(n1, n2)) {
      unmount(n1, parentComponent);
      n1 = null;
    }

    const { type, shapeFlag, ref } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Comment:
        processComment(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          // Teleport渲染逻辑交给组件内部处理
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container, anchor) { // teleport传送门，可以将组件或者元素移动到指定位置
              hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor);
            }
          });
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor, parentComponent);
        }
        break;
    }

    if (ref !== null) {
      setRef(ref, n2);
    }
  };

  /**
   * 卸载子节点
   * @param children
   * @param parentComponent
   */
  const unmountChildren = (children, parentComponent) => {
    for (let index = 0; index < children.length; index++) {
      unmount(children[index], parentComponent);
    }
  };

  /**
   * 卸载dom节点
   * @param vnode 虚拟节点
   * @param parentComponent 父组件
   */
  const unmount = (vnode, parentComponent = null) => {
    const { type, shapeFlag, children, el, transition } = vnode;

    const performRemove = () => {
      hostRemove(vnode.el); // 卸载dom元素
    };

    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      parentComponent.ctx.deactivate(vnode); // 执行KeepAlive的失活逻辑
    } else if (type === Fragment) { // 卸载Fragment组件
      unmountChildren(children, parentComponent);
    } else if (shapeFlag & ShapeFlags.TELEPORT) { // 卸载Teleport组件
      vnode.type.remove(vnode, unmountChildren);
    } else if (shapeFlag & ShapeFlags.COMPONENT) { // 卸载component组件
      unmount(vnode.component.subTree, parentComponent);
    } else {
      if (transition) {
        transition.leave(el, performRemove); // Transition组件离开
      } else {
        performRemove();
      }
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