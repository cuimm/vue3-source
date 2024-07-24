import { ShapeFlags } from '@vue/shared';
import { isSameVNode } from './vnode';

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
  const mountElement = (vnode, container) => {
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

    hostInsert(el, container);
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

    patchProps(oldProps, newProps, el);
  };

  /**
   * 处理元素节点
   * @param n1
   * @param n2
   * @param container
   */
  const processElement = (n1, n2, container) => {
    if (n1 === null) {
      // 老的虚拟节点为null，则说明是初始化操作，创建新的元素节点并插入到容器内
      mountElement(n2, container);
    } else {
      // n1和n2是相同节点 => diff
      patchElement(n1, n2, container);
    }
  };

  /**
   * dom diff
   * @param n1
   * @param n2
   * @param container
   */
  const patch = (n1, n2, container) => {
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

    processElement(n1, n2, container);
  };

  /**
   * 卸载dom节点
   * @param vnode
   */
  const unmount = vnode => {
    hostRemove(vnode.el);
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