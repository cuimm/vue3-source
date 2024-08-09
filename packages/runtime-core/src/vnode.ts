import { isArray, isFunction, isObject, isString, ShapeFlags } from '@vue/shared';
import { isTeleport } from './components/Teleport';

export const Text = Symbol('Text');

export const Comment = Symbol('Comment');

export const Fragment = Symbol('Fragment');

/**
 * 是否为虚拟节点
 * @param value
 */
export function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}

/**
 * 是否是相同的虚拟节点
 * @param n1
 * @param n2
 */
export function isSameVNode(n1 , n2) {
  return (n1.type === n2.type) && (n1.key === n2.key);
}

/**
 * 创建虚拟节点
 * @param type
 * @param props
 * @param children
 * @param patchFlag
 */
export function createVNode(type, props, children?, patchFlag?) {

  const shapeFlag: any = isString(type)
    ? ShapeFlags.ELEMENT // 元素
    : isTeleport(type)
      ? ShapeFlags.TELEPORT
      : isObject(type)
        ? ShapeFlags.STATEFUL_COMPONENT // 组件
        : isFunction(type)
          ? ShapeFlags.FUNCTIONAL_COMPONENT // 函数式组件
          : 0;

  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    shapeFlag: shapeFlag,
    key: props?.key, // 用于diff算法比对
    el: null, // 虚拟节点对应的真实节点
    ref: props?.ref, // 元素：dom元素  组件：实例/exposed
    patchFlag: patchFlag, // 用于dom diff靶向更新
  };

  // currentBlock收集有patchFlag的子节点
  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode);
  }

  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else if (isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    } else {
      vnode.children = String(children); // 文本统一转成字符串
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
  }

  return vnode;
}


/**************************** DOM DIFF优化 <靶向更新> ****************************/
/**
 * 用于收集动态虚拟子节点
 */
let currentBlock = null;

export function openBlock() {
  currentBlock = [];
}

export function closeBlock() {
  currentBlock = null;
}

export function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock;
  closeBlock();
  return vnode;
}

/**
 * 收集动态节点
 * @param type
 * @param props
 * @param children
 * @param patchFlag
 */
export function createElementBlock(type, props, children?, patchFlag?) {
  const vnode = createVNode(type, props, children, patchFlag);
  return setupBlock(vnode);
}

export { createVNode as createElementVNode };
