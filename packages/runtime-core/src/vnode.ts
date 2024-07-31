import { isArray, isFunction, isObject, isString, ShapeFlags } from '@vue/shared';

export const Text = Symbol('Text');

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
export function isSameVNode(n1, n2) {
  return (n1.type === n2.type) && (n1.key === n2.key);
}

/**
 * 创建虚拟节点
 * @param type
 * @param props
 * @param children
 */
export function createVNode(type, props, children?) {

  const shapeFlag: any = isString(type)
    ? ShapeFlags.ELEMENT // 元素
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
  };

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