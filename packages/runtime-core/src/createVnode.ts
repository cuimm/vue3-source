import { isArray, isString, ShapeFlags } from '@vue/shared';

export function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}

/**
 * 创建虚拟节点
 * @param type
 * @param props
 * @param children
 */
export function createVNode(type, props, children?) {

  let shapeFlag: any = isString(type) ? ShapeFlags.ELEMENT : 0;

  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    shapeFlag: shapeFlag,
    key: props?.key, // 用于diff算法比对
    el: null, // 虚拟节点对应的真实节点
  };

  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else {
      vnode.children = String(children); // 文本统一转成字符串
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
  }

  return vnode;
}