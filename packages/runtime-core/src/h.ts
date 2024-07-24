import { isArray, isObject } from '@vue/shared';
import { createVNode, isVNode } from './vnode';

export function h(type, propsOrChildren?, children?) {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [ propsOrChildren ]); // h(类型, 虚拟节点)
      } else {
        return createVNode(type, propsOrChildren); // h(类型, 属性)
      }
    } else {
      return createVNode(type, null, propsOrChildren); // h(类型, 文本/数组)
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [ children ];
    }
    return createVNode(type, propsOrChildren, children); // h(类型, 属性, 儿子...)
  }

}